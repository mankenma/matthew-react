import { kv } from '@vercel/kv';
import type { APIRoute } from 'astro';
import Filter from 'bad-words';

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

// Helper to get leaderboard (tries KV, falls back to local store only in development)
async function getLeaderboard() {
  try {
    // Try to use Vercel KV
    const result = await kv.zrange('high_roller_scores', 0, 9, { rev: true, withScores: true });
    const leaderboard = [];
    for (let i = 0; i < result.length; i += 2) {
      leaderboard.push({ name: result[i], score: result[i + 1] });
    }
    return leaderboard;
  } catch (error) {
    // Only use local store fallback in development
    // In production, KV should always be available
    const isDev = import.meta.env.DEV;
    if (isDev) {
      console.log('Using local store fallback (KV not available):', error.message);
      const entries = Array.from(localStore.entries())
        .map(([name, score]) => ({ name, score }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 10);
      return entries;
    } else {
      // In production, re-throw the error if KV fails
      throw error;
    }
  }
}

// Helper to save score (tries KV, falls back to local store only in development)
async function saveScore(name: string, score: number) {
  try {
    // Try to use Vercel KV
    await kv.zadd('high_roller_scores', { score, member: name }, { xx: false, gt: true });
  } catch (error) {
    // Only use local store fallback in development
    // In production, KV should always be available
    const isDev = import.meta.env.DEV;
    if (isDev) {
      console.log('Using local store fallback (KV not available):', error.message);
      const currentScore = localStore.get(name) || 0;
      if (score > currentScore) {
        localStore.set(name, score);
      }
    } else {
      // In production, re-throw the error if KV fails
      throw error;
    }
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

