import type { APIRoute } from 'astro';
import { Filter } from 'bad-words';
import filter from 'leo-profanity';

// --- Configuration ---
const DEBUG = true; // Set to false to disable logs
const profanityFilter = new Filter();
profanityFilter.addWords('gahoo');

// Custom blocklist for terms that might bypass library filters
const BLOCKED_TERMS = [
  'HITLER',
  'NAZI',
  'KKK',
  'ADMIN',
  'SYSTEM',
  'MODERATOR',
  'ROOT',
  'NULL',
  'UNDEFINED',
  'FUCK',
  'SHIT',
  'BITCH',
  'ASSHOLE',
  'CUNT',
  'NIGGER',
  'FAGGOT',
  'RETARD',
  'TRUMP',
  'BIDEN',
  // Add more specific terms as needed
];

// --- Helper: Logger ---
function log(msg: string, data?: any) {
  if (DEBUG) console.log(`[Leaderboard] ${msg}`, data ? JSON.stringify(data) : '');
}

// --- Helper: Hash IP Address (SHA-256) ---
async function hashIP(ip: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(ip);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// --- Helper: Multi-Layer Profanity Check ---
function isClean(username: string): boolean {
  const lowerUsername = username.toLowerCase();
  const upperUsername = username.toUpperCase();
  
  // Block all-caps usernames
  // Check if username contains at least one letter and is all uppercase
  if (username !== lowerUsername && username === upperUsername && /[a-zA-Z]/.test(username)) {
    log(`Blocked: All caps username: ${username}`);
    return false;
  }
  
  // Layer 1: bad-words filter (substring check)
  // Get the list of bad words and check if username contains any as substring
  const badWordsList = profanityFilter.list;
  if (badWordsList.some((badWord: string) => lowerUsername.includes(badWord.toLowerCase()))) {
    log(`Blocked by bad-words (substring): ${username}`);
    return false;
  }
  
  // Also check with the library's built-in method as fallback
  if (profanityFilter.isProfane(username)) {
    log(`Blocked by bad-words (exact): ${username}`);
    return false;
  }
  
  // Layer 2: leo-profanity check (substring check)
  // Get the list of profane words and check if username contains any as substring
  const leoProfanityList = filter.list();
  if (leoProfanityList.some((badWord: string) => lowerUsername.includes(badWord.toLowerCase()))) {
    log(`Blocked by leo-profanity (substring): ${username}`);
    return false;
  }
  
  // Also check with the library's built-in method as fallback
  if (filter.check(username)) {
    log(`Blocked by leo-profanity (exact): ${username}`);
    return false;
  }
  
  // Layer 3: Custom blocklist (substring check)
  for (const term of BLOCKED_TERMS) {
    if (upperUsername.includes(term)) {
      log(`Blocked by custom blocklist (${term}): ${username}`);
      return false;
    }
  }
  
  return true;
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
const localStore = new Map<string, { chips: number; cash: number; time: number | null }>();

// --- Core Logic ---

async function getLeaderboard() {
  const client = await getRedis();
  const isUpstash = !!import.meta.env.UPSTASH_REDIS_REST_URL;

  if (client) {
    try {
      // 1. Fetch Chips (Sorted Set)
      // Note: We request scores. Upstash returns either ['name', score, ...] or [{member, score}...]
      // Fetch top 35 to ensure we have enough for sorting, then slice to top 30
      const rawZRange = await client.zrange('high_roller_chips', 0, 34, { rev: true, withScores: true });
      
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

      // 2. Fetch Cash and Time (Hash + Fallback) - Parallel fetch
      const names = parsedResults.map(p => p.name);
      const cashMap: Record<string, number> = {};
      const timeMap: Record<string, number | null> = {};

      // Batch fetch Cash from Hash
      let cashHashValues: any[] = [];
      try {
        if (isUpstash) {
            // Upstash hmget
            cashHashValues = await client.hmget('high_roller_cash', ...names);
            // If hmget returns an object (key-value), convert to array
            if (cashHashValues && !Array.isArray(cashHashValues) && typeof cashHashValues === 'object') {
                 // @ts-ignore
                 cashHashValues = names.map(n => cashHashValues[n] || null);
          }
        } else {
            // Fallback loop for Vercel KV if hmget is tricky
             cashHashValues = await Promise.all(names.map(n => client.get(`cash:${n}`)));
        }
      } catch (e) {
        log('Cash hash fetch failed, ignoring', e);
        cashHashValues = new Array(names.length).fill(null);
      }

      // Batch fetch Time from Hash
      let timeHashValues: any[] = [];
      try {
        if (isUpstash) {
            // Upstash hmget
            timeHashValues = await client.hmget('high_roller_time', ...names);
            // If hmget returns an object (key-value), convert to array
            if (timeHashValues && !Array.isArray(timeHashValues) && typeof timeHashValues === 'object') {
                 // @ts-ignore
                 timeHashValues = names.map(n => timeHashValues[n] || null);
            }
        } else {
            // Fallback loop for Vercel KV if hmget is tricky
             timeHashValues = await Promise.all(names.map(n => client.get(`time:${n}`)));
        }
      } catch (e) {
        log('Time hash fetch failed, ignoring', e);
        timeHashValues = new Array(names.length).fill(null);
      }

      // Process Cash and Time Results with Individual Fallback
      await Promise.all(names.map(async (name, index) => {
        // Process Cash
        let cashVal = cashHashValues ? cashHashValues[index] : null;
        if (cashVal === null || cashVal === undefined) {
            try {
                cashVal = await client.get(`cash:${name}`);
            } catch (e) {}
        }
        cashMap[name] = Number(cashVal || 0);

        // Process Time
        let timeVal = timeHashValues ? timeHashValues[index] : null;
        if (timeVal === null || timeVal === undefined) {
            try {
                timeVal = await client.get(`time:${name}`);
            } catch (e) {}
        }
        // Convert to number if present, otherwise null (for backward compatibility)
        timeMap[name] = timeVal !== null && timeVal !== undefined ? Number(timeVal) : null;
      }));

      // 3. Merge & Sort
      return parsedResults
        .map(entry => ({
          name: entry.name,
          chips: entry.chips,
          cash: cashMap[entry.name] || 0,
          time: timeMap[entry.name] ?? null
        }))
        .sort((a, b) => (b.chips - a.chips) || (b.cash - a.cash)) // Sort by Chips, then Cash
        .slice(0, 30);
      
    } catch (e) {
      log('Critical Redis Read Error', e);
      return []; // Return empty on crash
    }
  }

  // Local Store Fallback
  return Array.from(localStore.entries())
    .map(([name, data]) => ({ name, chips: data.chips, cash: data.cash, time: data.time ?? null }))
    .sort((a, b) => {
      // Primary sort: chips (descending)
      if (b.chips !== a.chips) {
        return b.chips - a.chips;
      }
      // Secondary sort: cash (descending) on tie
      return b.cash - a.cash;
    })
    .slice(0, 30);
}

async function saveScore(name: string, chips: number, cash: number, time: number | null = null, metadata: { inventory: string | null; income_rate: number | null; device_info: string | null; location: string | null; ip_hash: string | null } | null = null) {
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

      log(`Update Check for ${name}: New(${chips}, $${cash}, time: ${time}) vs Old(${currentChips}, $${currentCash})`);

      // 2. Determine Update
      // Logic: Update if Chips are higher OR (Chips equal AND Cash higher)
      const isImprovement = chips > currentChips || (chips === currentChips && cash > currentCash);

      if (isImprovement) {
        log(`Saving improvement for ${name}`);
        
        // 3. Write to Redis (Dual Write for Cash and Time safety)
        if (isUpstash) {
            // Upstash: ZADD { score, member }
            await client.zadd('high_roller_chips', { score: chips, member: name });
            // Upstash: HSET { field: value }
            try {
              await client.hset('high_roller_cash', { [name]: cash });
            } catch (e) {
              // Fallback to individual key if hash fails
              log('Cash hash write failed, using fallback key', e);
              await client.set(`cash:${name}`, cash);
            }
            // Save time if provided
            if (time !== null && time !== undefined) {
              try {
                await client.hset('high_roller_time', { [name]: time });
              } catch (e) {
                log('Time hash write failed, using fallback key', e);
                await client.set(`time:${name}`, time);
              }
            }
        } else {
            // Vercel/Standard: ZADD score member
            await client.zadd('high_roller_chips', { score: chips, member: name }, { xx: false, gt: true });
            await client.set(`cash:${name}`, cash); // Fallback key
            // Save time if provided
            if (time !== null && time !== undefined) {
              await client.set(`time:${name}`, time);
            }
        }
        
        // 4. Store metadata in Redis HASH (separate from leaderboard ranking)
        if (metadata) {
          try {
            const metadataKey = `player_metadata:${name}`;
            const hashData: Record<string, string> = {};
            
            // Only include non-null fields
            if (metadata.inventory !== null) hashData.inventory = metadata.inventory;
            if (metadata.income_rate !== null) hashData.income_rate = String(metadata.income_rate);
            if (metadata.device_info !== null) hashData.device_info = metadata.device_info;
            if (metadata.location !== null) hashData.location = metadata.location;
            if (metadata.ip_hash !== null) hashData.ip_hash = metadata.ip_hash;
            
            // Store metadata in HASH using hset
            if (Object.keys(hashData).length > 0) {
              if (isUpstash) {
                await client.hset(metadataKey, hashData);
              } else {
                // Vercel KV fallback - use individual keys or hset if supported
                for (const [field, value] of Object.entries(hashData)) {
                  await client.hset(metadataKey, field, value);
                }
              }
              log(`Metadata saved for ${name}`);
            }
          } catch (e) {
            log('Error saving metadata (non-critical)', e);
            // Don't fail the entire request if metadata save fails
          }
        }
        
        log(`Successfully saved: ${name} - Chips: ${chips}, Cash: ${cash}, Time: ${time}`);
      } else {
        log(`Score not high enough for ${name}`);
      }
    } catch (e) {
      log('Critical Redis Save Error', e);
    }
  } else {
    // Local Store Logic
    const curr = localStore.get(name) || { chips: 0, cash: 0, time: null };
    if (chips > curr.chips || (chips === curr.chips && cash > curr.cash)) {
      localStore.set(name, { chips, cash, time: time ?? null });
      log(`Local store updated: ${name} - Chips: ${chips}, Cash: ${cash}, Time: ${time}`);
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

    const { name, chips, cash, time, assets, incomePerSecond, userAgent } = body;

    // Extract IP and location from headers
    const forwardedFor = request.headers.get('x-forwarded-for');
    const ip = forwardedFor ? forwardedFor.split(',')[0].trim() : null;
    const city = request.headers.get('x-vercel-ip-city') || request.headers.get('cf-ipcity') || null;
    const country = request.headers.get('x-vercel-ip-country') || request.headers.get('cf-ipcountry') || null;
    
    // Hash IP for privacy
    let ipHash: string | null = null;
    if (ip) {
      try {
        ipHash = await hashIP(ip);
      } catch (e) {
        log('Error hashing IP', e);
      }
    }

    // Build location string
    const location = city && country ? `${city}, ${country}` : city || country || null;

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

    if (!isClean(trimmedName)) {
      return new Response(JSON.stringify({ error: 'Username not allowed.' }), { 
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

    // Validate time (optional, but if provided must be valid)
    let validatedTime: number | null = null;
    if (time !== undefined && time !== null) {
      if (!Number.isFinite(time) || time < 0 || time > Number.MAX_SAFE_INTEGER) {
        return new Response(JSON.stringify({ error: 'Invalid time value' }), { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      validatedTime = Math.floor(time);
    }

    // Validate and prepare metadata
    let validatedAssets: string | null = null;
    if (assets !== undefined && assets !== null) {
      if (typeof assets === 'object') {
        validatedAssets = JSON.stringify(assets);
      } else if (typeof assets === 'string') {
        // Already stringified, validate it's valid JSON
        try {
          JSON.parse(assets);
          validatedAssets = assets;
        } catch (e) {
          log('Invalid assets JSON string', e);
        }
      }
    }

    let validatedIncomeRate: number | null = null;
    if (incomePerSecond !== undefined && incomePerSecond !== null) {
      if (Number.isFinite(incomePerSecond) && incomePerSecond >= 0 && incomePerSecond <= Number.MAX_SAFE_INTEGER) {
        validatedIncomeRate = Math.floor(incomePerSecond);
      }
    }

    const validatedDeviceInfo = userAgent && typeof userAgent === 'string' ? userAgent.substring(0, 500) : null; // Limit length

    // Prepare metadata object
    const metadata = {
      inventory: validatedAssets,
      income_rate: validatedIncomeRate,
      device_info: validatedDeviceInfo,
      location: location,
      ip_hash: ipHash
    };

    await saveScore(trimmedName, Math.floor(chips), Math.floor(cash), validatedTime, metadata);
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
          log('Cash hash delete failed, trying key', e);
        }
        try {
          await client.hdel('high_roller_time', name);
        } catch (e) {
          log('Time hash delete failed, trying key', e);
        }
      }
      
      // Also remove from fallback keys
      try {
        await client.del(`cash:${name}`);
      } catch (e) {
        // Ignore if key doesn't exist
      }
      try {
        await client.del(`time:${name}`);
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
