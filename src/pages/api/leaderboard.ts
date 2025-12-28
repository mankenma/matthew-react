import type { APIRoute } from 'astro';
import { Filter } from 'bad-words';

// --- Configuration ---
const DEBUG = true; // Set to false to disable logs
const profanityFilter = new Filter();
profanityFilter.addWords('gahoo');
const RESERVED_WORDS = ['ADMIN', 'SYSTEM', 'MODERATOR', 'ROOT', 'NULL', 'UNDEFINED'];

// --- Helper: Logger ---
function log(msg: string, data?: any) {
  if (DEBUG) console.log(`[Leaderboard] ${msg}`, data ? JSON.stringify(data) : '');
}

// --- Helper: Profanity Check ---
function isProfane(name: string): boolean {
  if (profanityFilter.isProfane(name)) return true;
  return RESERVED_WORDS.some(word => name.toUpperCase().includes(word));
}

// --- Redis Client Factory ---
let redis: any = null;

async function getRedis() {
  if (redis) return redis;
  
  // 1. Check for Upstash (HTTPS)
  if (import.meta.env.UPSTASH_REDIS_REST_URL && import.meta.env.UPSTASH_REDIS_REST_TOKEN) {
    try {
      const { Redis } = await import('@upstash/redis');
      redis = new Redis({
        url: import.meta.env.UPSTASH_REDIS_REST_URL,
        token: import.meta.env.UPSTASH_REDIS_REST_TOKEN,
      });
      log('Connected to Upstash Redis');
      return redis;
    } catch (e) {
      log('Failed to load Upstash client', e);
    }
  } 
  
  // 2. Check for Vercel KV
  if (import.meta.env.KV_REST_API_URL) {
    try {
      const { kv } = await import('@vercel/kv');
      redis = kv;
      log('Connected to Vercel KV');
      return redis;
    } catch (e) {
      log('Failed to load Vercel KV', e);
    }
  }

  log('Using In-Memory Local Store (Not Persistent)');
  return null;
}

// --- Local Fallback Store ---
const localStore = new Map<string, { chips: number; cash: number }>();

// --- Core Logic ---

async function getLeaderboard() {
  const client = await getRedis();
  const isUpstash = !!import.meta.env.UPSTASH_REDIS_REST_URL;

  if (client) {
    try {
      // 1. Fetch Chips (Sorted Set)
      // Note: We request scores. Upstash returns either ['name', score, ...] or [{member, score}...]
      const rawZRange = await client.zrange('high_roller_chips', 0, 19, { rev: true, withScores: true });
      
      const parsedResults: { name: string; chips: number }[] = [];

      // HYBRID PARSER: Handle both Flat Array and Object Array
      if (Array.isArray(rawZRange)) {
        if (rawZRange.length > 0 && typeof rawZRange[0] === 'object' && rawZRange[0] !== null) {
          // Object Array Strategy: [{ member: 'Matt', score: 100 }]
          parsedResults.push(...rawZRange.map((item: any) => ({
            name: item.member,
            chips: Number(item.score)
          })));
        } else {
          // Flat Array Strategy: ['Matt', 100, 'John', 50]
          for (let i = 0; i < rawZRange.length; i += 2) {
            parsedResults.push({
              name: String(rawZRange[i]),
              chips: Number(rawZRange[i + 1])
            });
          }
        }
      }

      if (parsedResults.length === 0) return [];

      // 2. Fetch Cash (Hash + Fallback)
      const names = parsedResults.map(p => p.name);
      const cashMap: Record<string, number> = {};

      // Batch fetch from Hash
      let hashValues: any[] = [];
      try {
        if (isUpstash) {
            // Upstash hmget
            hashValues = await client.hmget('high_roller_cash', ...names);
            // If hmget returns an object (key-value), convert to array
            if (hashValues && !Array.isArray(hashValues) && typeof hashValues === 'object') {
                 // @ts-ignore
                 hashValues = names.map(n => hashValues[n] || null);
            }
        } else {
            // Fallback loop for Vercel KV if hmget is tricky
             hashValues = await Promise.all(names.map(n => client.get(`cash:${n}`)));
        }
      } catch (e) {
        log('Hash fetch failed, ignoring', e);
        hashValues = new Array(names.length).fill(null);
      }

      // Process Cash Results with Individual Fallback
      await Promise.all(names.map(async (name, index) => {
        let val = hashValues ? hashValues[index] : null;
        
        // If null, try fetching individual legacy key
        if (val === null || val === undefined) {
            try {
                val = await client.get(`cash:${name}`);
            } catch (e) {}
        }
        
        cashMap[name] = Number(val || 0);
      }));

      // 3. Merge & Sort
      return parsedResults
        .map(entry => ({
          name: entry.name,
          chips: entry.chips,
          cash: cashMap[entry.name] || 0
        }))
        .sort((a, b) => (b.chips - a.chips) || (b.cash - a.cash)) // Sort by Chips, then Cash
        .slice(0, 10);

    } catch (e) {
      log('Critical Redis Read Error', e);
      return []; // Return empty on crash
    }
  }

  // Local Store Fallback
  return Array.from(localStore.entries())
    .map(([name, data]) => ({ name, chips: data.chips, cash: data.cash }))
    .sort((a, b) => {
      // Primary sort: chips (descending)
      if (b.chips !== a.chips) {
        return b.chips - a.chips;
      }
      // Secondary sort: cash (descending) on tie
      return b.cash - a.cash;
    })
    .slice(0, 10);
}

async function saveScore(name: string, chips: number, cash: number) {
  const client = await getRedis();
  const isUpstash = !!import.meta.env.UPSTASH_REDIS_REST_URL;

  if (client) {
    try {
      // 1. Get Current Score (Defensive)
      let currentChips = 0;
      let currentCash = 0;

      try {
        const s = await client.zscore('high_roller_chips', name);
        currentChips = Number(s || 0);
        
        // Try Hash first
        let c = await client.hget('high_roller_cash', name);
        // If null, try Key
        if (c === null || c === undefined) {
          try {
            c = await client.get(`cash:${name}`);
          } catch (e) {
            // Ignore errors
          }
        }
        currentCash = Number(c || 0);
      } catch (e) {
        log('Error reading previous score', e);
      }

      log(`Update Check for ${name}: New(${chips}, $${cash}) vs Old(${currentChips}, $${currentCash})`);

      // 2. Determine Update
      // Logic: Update if Chips are higher OR (Chips equal AND Cash higher)
      const isImprovement = chips > currentChips || (chips === currentChips && cash > currentCash);

      if (isImprovement) {
        log(`Saving improvement for ${name}`);
        
        // 3. Write to Redis (Dual Write for Cash safety)
        if (isUpstash) {
            // Upstash: ZADD { score, member }
            await client.zadd('high_roller_chips', { score: chips, member: name });
            // Upstash: HSET { field: value }
            try {
              await client.hset('high_roller_cash', { [name]: cash });
            } catch (e) {
              // Fallback to individual key if hash fails
              log('Hash write failed, using fallback key', e);
              await client.set(`cash:${name}`, cash);
            }
        } else {
            // Vercel/Standard: ZADD score member
            await client.zadd('high_roller_chips', { score: chips, member: name }, { xx: false, gt: true });
            await client.set(`cash:${name}`, cash); // Fallback key
        }
        
        log(`Successfully saved: ${name} - Chips: ${chips}, Cash: ${cash}`);
      } else {
        log(`Score not high enough for ${name}`);
      }
    } catch (e) {
      log('Critical Redis Save Error', e);
    }
  } else {
    // Local Store Logic
    const curr = localStore.get(name) || { chips: 0, cash: 0 };
    if (chips > curr.chips || (chips === curr.chips && cash > curr.cash)) {
      localStore.set(name, { chips, cash });
      log(`Local store updated: ${name} - Chips: ${chips}, Cash: ${cash}`);
    }
  }
}

// --- API Endpoints ---

export const GET: APIRoute = async ({ url }) => {
  try {
    const data = await getLeaderboard();
    
    // Check if this is a cache-busting request (has timestamp query param)
    const hasCacheBust = url?.searchParams?.has('t');
    const cacheControl = hasCacheBust 
      ? 'no-cache, no-store, must-revalidate' 
      : 'public, max-age=5';
    
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { 
        'Content-Type': 'application/json', 
        'Cache-Control': cacheControl
      }
    });
  } catch (e) {
    log('API GET Error', e);
    return new Response(JSON.stringify({ error: 'Failed to fetch leaderboard' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

export const POST: APIRoute = async ({ request }) => {
  try {
    // Validate Content-Type
    const contentType = request.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      return new Response(JSON.stringify({ error: 'Invalid content type' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    let body;
    try {
      body = await request.json();
    } catch (e) {
      return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const { name, chips, cash } = body;

    // Validation
    if (!name || typeof name !== 'string') {
      return new Response(JSON.stringify({ error: 'Invalid name' }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const trimmedName = name.trim();
    if (trimmedName.length === 0 || trimmedName.length > 12) {
      return new Response(JSON.stringify({ error: 'Invalid name' }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (isProfane(trimmedName)) {
      return new Response(JSON.stringify({ error: 'Name not allowed' }), { 
        status: 422,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (!Number.isFinite(chips) || chips < 0 || chips > Number.MAX_SAFE_INTEGER) {
      return new Response(JSON.stringify({ error: 'Invalid chips value' }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (!Number.isFinite(cash) || cash < 0 || cash > Number.MAX_SAFE_INTEGER) {
      return new Response(JSON.stringify({ error: 'Invalid cash value' }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    await saveScore(trimmedName, Math.floor(chips), Math.floor(cash));
    return new Response(JSON.stringify({ success: true }), { 
      status: 200,
      headers: { 
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache'
      }
    });

  } catch (e) {
    log('API POST Error', e);
    return new Response(JSON.stringify({ error: 'Server error' }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

async function deleteScore(name: string) {
  const client = await getRedis();
  const isUpstash = !!import.meta.env.UPSTASH_REDIS_REST_URL;

  if (client) {
    try {
      // Remove from chips sorted set
      await client.zrem('high_roller_chips', name);
      
      // Remove from cash hash
      if (isUpstash) {
        try {
          await client.hdel('high_roller_cash', name);
        } catch (e) {
          log('Hash delete failed, trying key', e);
        }
      }
      
      // Also remove from fallback key
      try {
        await client.del(`cash:${name}`);
      } catch (e) {
        // Ignore if key doesn't exist
      }
      
      log(`Deleted entry: ${name}`);
      return true;
    } catch (e) {
      log('Error deleting score', e);
      throw e;
    }
  } else {
    // Local store fallback
    localStore.delete(name);
    log(`Deleted from local store: ${name}`);
    return true;
  }
}

export const DELETE: APIRoute = async ({ request }) => {
  try {
    // Validate Content-Type
    const contentType = request.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      return new Response(JSON.stringify({ error: 'Invalid content type' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    let body;
    try {
      body = await request.json();
    } catch (e) {
      return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const { name } = body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return new Response(JSON.stringify({ error: 'Invalid name' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    await deleteScore(name.trim());
    
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache'
      }
    });

  } catch (e) {
    log('API DELETE Error', e);
    return new Response(JSON.stringify({ error: 'Server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
