import type { APIRoute } from 'astro';
import { Filter } from 'bad-words';

// Use Upstash Redis (works on Netlify, Vercel, and any platform)
// Falls back to local store in development if not configured
let redis: any = null;

// Initialize Redis connection (lazy load to avoid build-time issues)
async function getRedis() {
  if (redis) return redis;
  
  try {
    // Try to use Upstash Redis if environment variables are set
    if (import.meta.env.UPSTASH_REDIS_REST_URL && import.meta.env.UPSTASH_REDIS_REST_TOKEN) {
      const { Redis } = await import('@upstash/redis');
      redis = new Redis({
        url: import.meta.env.UPSTASH_REDIS_REST_URL,
        token: import.meta.env.UPSTASH_REDIS_REST_TOKEN,
      });
      return redis;
    } else if (import.meta.env.KV_REST_API_URL && import.meta.env.KV_REST_API_TOKEN) {
      // Fallback to Vercel KV if available
      const { kv } = await import('@vercel/kv');
      redis = kv;
      return redis;
    }
  } catch (error) {
    console.log('Redis not configured, using local store fallback');
  }
  
  return null;
}

// Initialize profanity filter library (keeps bad words out of source code)
const profanityFilter = new Filter();

// Add custom blocked word
profanityFilter.addWords('gahoo');

// System/reserved words that should be blocked (not profanity, so separate list)
const RESERVED_WORDS = ['ADMIN', 'SYSTEM', 'MODERATOR', 'ROOT', 'NULL', 'UNDEFINED'];

// Check if name contains profanity or reserved words (case-insensitive)
function isProfane(name: string): boolean {
  // Check for profanity using the library
  if (profanityFilter.isProfane(name)) {
    return true;
  }
  
  // Check for reserved system words
  const upperName = name.toUpperCase();
  return RESERVED_WORDS.some(word => upperName.includes(word));
}

// Local development fallback - in-memory store
// This will be used when Vercel KV is not available (e.g., local development)
const localStore = new Map<string, { chips: number; cash: number }>();

// Helper to get leaderboard (tries Redis, falls back to local store)
// Returns sorted by chips (desc), then cash (desc) on tie
async function getLeaderboard() {
  const redisClient = await getRedis();
  if (redisClient) {
    try {
      // Get top players by chips (sorted set)
      let chipsResults: any[] = [];
      if (typeof redisClient.zrange === 'function' && redisClient.constructor?.name === 'Redis') {
        // Upstash Redis API
        const result = await redisClient.zrange('high_roller_chips', 0, 19, { rev: true, withScores: true });
        for (let i = 0; i < result.length; i += 2) {
          chipsResults.push({ name: result[i], chips: Number(result[i + 1]) });
        }
      } else {
        // Vercel KV API (legacy support)
        const result = await redisClient.zrange('high_roller_chips', 0, 19, { rev: true, withScores: true });
        for (let i = 0; i < result.length; i += 2) {
          chipsResults.push({ name: result[i], chips: result[i + 1] });
        }
      }
      
      // Get cash values for all players
      // Use individual keys instead of hash for better compatibility
      const cashValues: Record<string, number> = {};
      if (chipsResults.length > 0) {
        const names = chipsResults.map(r => r.name);
        if (typeof redisClient.hmget === 'function' && redisClient.constructor?.name === 'Redis') {
          // Upstash Redis - try hash first, fallback to individual keys
          try {
            const cashResults = await redisClient.hmget('high_roller_cash', ...names);
            names.forEach((name, idx) => {
              cashValues[name] = cashResults && cashResults[idx] !== null ? Number(cashResults[idx]) : 0;
            });
          } catch {
            // Fallback to individual keys
            for (const name of names) {
              try {
                const cash = await redisClient.get(`cash:${name}`);
                cashValues[name] = cash !== null && cash !== undefined ? Number(cash) : 0;
              } catch {
                cashValues[name] = 0;
              }
            }
          }
        } else {
          // Vercel KV - use individual keys (doesn't support hash operations well)
          for (const name of names) {
            try {
              const cash = await redisClient.get(`cash:${name}`);
              cashValues[name] = cash !== null && cash !== undefined ? Number(cash) : 0;
            } catch {
              cashValues[name] = 0;
            }
          }
        }
      }
      
      // Combine chips and cash, then sort
      const leaderboard = chipsResults
        .map(entry => ({
          name: entry.name,
          chips: entry.chips,
          cash: cashValues[entry.name] || 0
        }))
        .sort((a, b) => {
          // Primary sort: chips (descending)
          if (b.chips !== a.chips) {
            return b.chips - a.chips;
          }
          // Secondary sort: cash (descending) on tie
          return b.cash - a.cash;
        })
        .slice(0, 10);
      
      return leaderboard;
    } catch (error) {
      console.error('Redis error, falling back to local store:', error);
    }
  }
  
  // Fallback to local store (works in development)
  const entries = Array.from(localStore.entries())
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
  return entries;
}

// Helper to save score (tries Redis, falls back to local store)
// Only updates if chips are higher, or chips are equal and cash is higher
async function saveScore(name: string, chips: number, cash: number) {
  const redisClient = await getRedis();
  if (redisClient) {
    try {
      // Get current values
      let currentChips = 0;
      let currentCash = 0;
      
      if (typeof redisClient.zscore === 'function' && redisClient.constructor?.name === 'Redis') {
        // Upstash Redis API
        const chipsResult = await redisClient.zscore('high_roller_chips', name);
        currentChips = chipsResult !== null ? Number(chipsResult) : 0;
        
        // Try hash first, fallback to individual key
        try {
          const cashResult = await redisClient.hget('high_roller_cash', name);
          currentCash = cashResult !== null && cashResult !== undefined ? Number(cashResult) : 0;
        } catch {
          try {
            const cashResult = await redisClient.get(`cash:${name}`);
            currentCash = cashResult !== null && cashResult !== undefined ? Number(cashResult) : 0;
          } catch {
            currentCash = 0;
          }
        }
      } else {
        // Vercel KV API - use individual keys (doesn't support hash operations)
        try {
          const chipsResult = await redisClient.zscore('high_roller_chips', name);
          currentChips = chipsResult !== null ? Number(chipsResult) : 0;
        } catch {}
        try {
          const cashResult = await redisClient.get(`cash:${name}`);
          currentCash = cashResult !== null && cashResult !== undefined ? Number(cashResult) : 0;
        } catch {
          currentCash = 0;
        }
      }
      
      // Only update if chips are higher, or chips equal and cash is higher
      const shouldUpdate = chips > currentChips || (chips === currentChips && cash > currentCash);
      
      if (shouldUpdate) {
        if (typeof redisClient.zadd === 'function' && redisClient.constructor?.name === 'Redis') {
          // Upstash Redis API
          await redisClient.zadd('high_roller_chips', { score: chips, member: name });
          // Try hash first, fallback to individual key
          try {
            await redisClient.hset('high_roller_cash', { [name]: cash });
          } catch {
            // Fallback to individual key
            await redisClient.set(`cash:${name}`, cash);
          }
        } else {
          // Vercel KV API - use individual keys (doesn't support hash operations)
          await redisClient.zadd('high_roller_chips', { score: chips, member: name }, { xx: false, gt: true });
          await redisClient.set(`cash:${name}`, cash);
        }
      }
      return;
    } catch (error) {
      console.error('Redis error, falling back to local store:', error);
    }
  }
  
  // Fallback to local store (works in development)
  const current = localStore.get(name) || { chips: 0, cash: 0 };
  const shouldUpdate = chips > current.chips || (chips === current.chips && cash > current.cash);
  if (shouldUpdate) {
    localStore.set(name, { chips, cash });
  }
}

export const GET: APIRoute = async () => {
  try {
    const leaderboard = await getLeaderboard();
    return new Response(JSON.stringify(leaderboard), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=30', // Cache for 30 seconds
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
    
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
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

