import type { APIRoute } from 'astro';
import { Filter } from 'bad-words';

// Initialize profanity filter
const profanityFilter = new Filter();
profanityFilter.addWords('gahoo');
const RESERVED_WORDS = ['ADMIN', 'SYSTEM', 'MODERATOR', 'ROOT', 'NULL', 'UNDEFINED'];

function isProfane(name: string): boolean {
  if (profanityFilter.isProfane(name)) return true;
  return RESERVED_WORDS.some(word => name.toUpperCase().includes(word));
}

let redis: any = null;

async function getRedis() {
  if (redis) return redis;
  try {
    if (import.meta.env.UPSTASH_REDIS_REST_URL && import.meta.env.UPSTASH_REDIS_REST_TOKEN) {
      const { Redis } = await import('@upstash/redis');
      redis = new Redis({
        url: import.meta.env.UPSTASH_REDIS_REST_URL,
        token: import.meta.env.UPSTASH_REDIS_REST_TOKEN,
      });
      return redis;
    } else if (import.meta.env.KV_REST_API_URL && import.meta.env.KV_REST_API_TOKEN) {
      const { kv } = await import('@vercel/kv');
      redis = kv;
      return redis;
    }
  } catch (error) {
    console.log('Redis setup failed', error);
  }
  return null;
}

// Local fallback
const localStore = new Map<string, { chips: number; cash: number }>();

async function getLeaderboard() {
  const redisClient = await getRedis();
  const isUpstash = !!import.meta.env.UPSTASH_REDIS_REST_URL; // ✅ Reliable check

  if (redisClient) {
    try {
      let chipsResults: any[] = [];
      
      // FETCH CHIPS
      if (isUpstash) {
        // Upstash API
        const result = await redisClient.zrange('high_roller_chips', 0, 19, { rev: true, withScores: true });
        for (let i = 0; i < result.length; i += 2) {
          chipsResults.push({ name: result[i], chips: Number(result[i + 1]) });
        }
      } else {
        // Vercel KV API
        const result = await redisClient.zrange('high_roller_chips', 0, 19, { rev: true, withScores: true });
        for (let i = 0; i < result.length; i += 2) {
          chipsResults.push({ name: result[i], chips: result[i + 1] });
        }
      }
      
      // FETCH CASH
      const cashValues: Record<string, number> = {};
      if (chipsResults.length > 0) {
        const names = chipsResults.map(r => r.name);
        
        if (isUpstash) {
          // Optimized Hash Get for Upstash
          try {
            const cashResults = await redisClient.hmget('high_roller_cash', ...names);
            // Handle possibility of hmget returning nulls or object
            if (cashResults) {
                names.forEach((name, idx) => {
                    // @ts-ignore
                    cashValues[name] = Number(cashResults[idx] || 0);
                });
            }
          } catch (e) {
             // Fallback to individual keys if hash fails
             for (const name of names) {
                const c = await redisClient.get(`cash:${name}`);
                cashValues[name] = Number(c || 0);
             }
          }
        } else {
          // Vercel KV
          for (const name of names) {
            const cash = await redisClient.get(`cash:${name}`);
            cashValues[name] = Number(cash || 0);
          }
        }
      }
      
      return chipsResults
        .map(entry => ({
          name: entry.name,
          chips: entry.chips,
          cash: cashValues[entry.name] || 0
        }))
        .sort((a, b) => (b.chips - a.chips) || (b.cash - a.cash))
        .slice(0, 10);

    } catch (error) {
      console.error('Redis fetch error:', error);
    }
  }
  
  // Fallback to local store
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
  const redisClient = await getRedis();
  const isUpstash = !!import.meta.env.UPSTASH_REDIS_REST_URL; // ✅ Reliable check

  if (redisClient) {
    try {
      let currentChips = 0;
      let currentCash = 0;
      
      // GET CURRENT SCORE
      if (isUpstash) {
        const s = await redisClient.zscore('high_roller_chips', name);
        currentChips = Number(s || 0);
        
        // Try hash first, fallback to key
        try {
            const c = await redisClient.hget('high_roller_cash', name);
            currentCash = Number(c || 0);
        } catch {
            const c = await redisClient.get(`cash:${name}`);
            currentCash = Number(c || 0);
        }
      } else {
        // Vercel KV
        currentChips = Number(await redisClient.zscore('high_roller_chips', name) || 0);
        currentCash = Number(await redisClient.get(`cash:${name}`) || 0);
      }
      
      // CHECK IF UPDATE NEEDED
      const shouldUpdate = chips > currentChips || (chips === currentChips && cash > currentCash);
      
      if (shouldUpdate) {
        if (isUpstash) {
          // ✅ Correct Upstash Call (No unsupported options)
          await redisClient.zadd('high_roller_chips', { score: chips, member: name });
          try {
            await redisClient.hset('high_roller_cash', { [name]: cash });
          } catch {
            // Fallback to individual key if hash fails
            await redisClient.set(`cash:${name}`, cash);
          }
        } else {
          // Vercel KV Call
          await redisClient.zadd('high_roller_chips', { score: chips, member: name }, { xx: false, gt: true });
          await redisClient.set(`cash:${name}`, cash);
        }
      }
      return;
    } catch (error) {
      console.error('Redis save error:', error);
    }
  }
  
  // Fallback to local store (works in development, but NOT in production serverless functions)
  console.warn('Redis not configured - using local store fallback. Data will NOT persist in production serverless functions.');
  const current = localStore.get(name) || { chips: 0, cash: 0 };
  const shouldUpdate = chips > current.chips || (chips === current.chips && cash > current.cash);
  if (shouldUpdate) {
    localStore.set(name, { chips, cash });
    console.log(`Local store updated: ${name}, chips: ${chips}, cash: ${cash}`);
  }
}

export const GET: APIRoute = async ({ url }) => {
  try {
    const leaderboard = await getLeaderboard();
    
    // Check if this is a cache-busting request (has timestamp query param)
    const hasCacheBust = url?.searchParams?.has('t');
    const cacheControl = hasCacheBust 
      ? 'no-cache, no-store, must-revalidate' 
      : 'public, max-age=5'; // Reduced to 5 seconds for faster updates
    
    return new Response(JSON.stringify(leaderboard), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': cacheControl,
      },
    });
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch leaderboard' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      },
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
        headers: {
          'Content-Type': 'application/json',
        },
      });
    }

    let body;
    try {
      body = await request.json();
    } catch (e) {
      return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
        },
      });
    }

    const { name, chips, cash } = body;
    
    // Validate name
    if (!name || typeof name !== 'string') {
      return new Response(JSON.stringify({ error: 'Invalid name or score' }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
        },
      });
    }

    // Trim and validate name length
    const trimmedName = name.trim();
    if (trimmedName.length === 0 || trimmedName.length > 12) {
      return new Response(JSON.stringify({ error: 'Invalid name or score' }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
        },
      });
    }

    // Validate chips - must be a finite non-negative number
    if (typeof chips !== 'number' || !Number.isFinite(chips) || chips < 0 || chips > Number.MAX_SAFE_INTEGER) {
      return new Response(JSON.stringify({ error: 'Invalid chips value' }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
        },
      });
    }

    // Validate cash - must be a finite non-negative number
    if (typeof cash !== 'number' || !Number.isFinite(cash) || cash < 0 || cash > Number.MAX_SAFE_INTEGER) {
      return new Response(JSON.stringify({ error: 'Invalid cash value' }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
        },
      });
    }
    
    // Profanity check - return 422 if name contains bad words
    if (isProfane(trimmedName)) {
      return new Response(JSON.stringify({ error: 'Name not allowed' }), {
        status: 422,
        headers: {
          'Content-Type': 'application/json',
        },
      });
    }
    
    await saveScore(trimmedName, Math.floor(chips), Math.floor(cash));
    
    // Log for debugging
    console.log(`Score saved: ${trimmedName}, chips: ${Math.floor(chips)}, cash: ${Math.floor(cash)}`);
    
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache', // Don't cache POST responses
      },
    });
  } catch (error: any) {
    console.error('Error submitting score:', error);
    // Return more detailed error in development
    const errorMessage = import.meta.env.DEV ? error?.message || 'Failed to submit score' : 'Failed to submit score';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
};
