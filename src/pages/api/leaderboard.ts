import type { APIRoute } from 'astro';
import Filter from 'bad-words';

// Use Upstash Redis (works on Netlify, Vercel, and any platform)
// Falls back to local store in development if not configured
let redis: any = null;

// Initialize Redis connection
try {
  // Try to use Upstash Redis if environment variables are set
  if (import.meta.env.UPSTASH_REDIS_REST_URL && import.meta.env.UPSTASH_REDIS_REST_TOKEN) {
    const { Redis } = await import('@upstash/redis');
    redis = new Redis({
      url: import.meta.env.UPSTASH_REDIS_REST_URL,
      token: import.meta.env.UPSTASH_REDIS_REST_TOKEN,
    });
  } else if (import.meta.env.KV_REST_API_URL && import.meta.env.KV_REST_API_TOKEN) {
    // Fallback to Vercel KV if available
    const { kv } = await import('@vercel/kv');
    redis = kv;
  }
} catch (error) {
  console.log('Redis not configured, using local store fallback');
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
const localStore = new Map<string, number>();

// Helper to get leaderboard (tries Redis, falls back to local store)
async function getLeaderboard() {
  if (redis) {
    try {
      // Check if it's Upstash Redis (has zrange method with different signature)
      if (typeof redis.zrange === 'function' && redis.constructor?.name === 'Redis') {
        // Upstash Redis API - returns array of [member, score, member, score, ...]
        const result = await redis.zrange('high_roller_scores', 0, 9, { rev: true, withScores: true });
        const leaderboard = [];
        // Upstash returns as array of alternating member/score pairs
        for (let i = 0; i < result.length; i += 2) {
          leaderboard.push({ name: result[i], score: Number(result[i + 1]) });
        }
        return leaderboard;
      } else {
        // Vercel KV API (legacy support)
        const result = await redis.zrange('high_roller_scores', 0, 9, { rev: true, withScores: true });
        const leaderboard = [];
        for (let i = 0; i < result.length; i += 2) {
          leaderboard.push({ name: result[i], score: result[i + 1] });
        }
        return leaderboard;
      }
    } catch (error) {
      console.error('Redis error, falling back to local store:', error);
    }
  }
  
  // Fallback to local store (works in development)
  const entries = Array.from(localStore.entries())
    .map(([name, score]) => ({ name, score }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);
  return entries;
}

// Helper to save score (tries Redis, falls back to local store)
async function saveScore(name: string, score: number) {
  if (redis) {
    try {
      // Check if it's Upstash Redis
      if (typeof redis.zadd === 'function' && redis.constructor?.name === 'Redis') {
        // Upstash Redis API - only update if score is greater
        const current = await redis.zscore('high_roller_scores', name);
        if (current === null || score > Number(current)) {
          await redis.zadd('high_roller_scores', { score, member: name });
        }
      } else {
        // Vercel KV API (legacy support)
        await redis.zadd('high_roller_scores', { score, member: name }, { xx: false, gt: true });
      }
      return;
    } catch (error) {
      console.error('Redis error, falling back to local store:', error);
    }
  }
  
  // Fallback to local store (works in development)
  const currentScore = localStore.get(name) || 0;
  if (score > currentScore) {
    localStore.set(name, score);
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

    const { name, score } = body;
    
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

    // Validate score - must be a finite positive number
    if (typeof score !== 'number' || !Number.isFinite(score) || score < 0 || score > Number.MAX_SAFE_INTEGER) {
      return new Response(JSON.stringify({ error: 'Invalid name or score' }), {
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
    
    await saveScore(trimmedName, Math.floor(score));
    
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('Error submitting score:', error);
    return new Response(JSON.stringify({ error: 'Failed to submit score' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
};

