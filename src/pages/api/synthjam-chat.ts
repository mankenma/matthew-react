import type { APIRoute } from 'astro';
import filter from 'leo-profanity';

// Redis Client Factory (reuse pattern from leaderboard)
let redis: any = null;

async function getRedis() {
  if (redis) return redis;
  
  // Check for Upstash
  if (import.meta.env.UPSTASH_REDIS_REST_URL && import.meta.env.UPSTASH_REDIS_REST_TOKEN) {
    try {
      const { Redis } = await import('@upstash/redis');
      redis = new Redis({
        url: import.meta.env.UPSTASH_REDIS_REST_URL,
        token: import.meta.env.UPSTASH_REDIS_REST_TOKEN,
      });
      return redis;
    } catch (e) {
      console.error('Failed to load Upstash client', e);
    }
  }
  
  // Check for Vercel KV
  if (import.meta.env.KV_REST_API_URL) {
    try {
      const { kv } = await import('@vercel/kv');
      redis = kv;
      return redis;
    } catch (e) {
      console.error('Failed to load Vercel KV', e);
    }
  }
  
  return null;
}

// Save chat message to Redis
export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { userId, name, message, timestamp } = body;

    // Validate
    if (!userId || !name || !message || typeof message !== 'string') {
      return new Response(JSON.stringify({ error: 'Invalid message data' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Profanity filter
    let sanitizedMessage = message.trim();
    if (filter.check(sanitizedMessage)) {
      sanitizedMessage = filter.clean(sanitizedMessage);
    }

    if (!sanitizedMessage) {
      return new Response(JSON.stringify({ error: 'Message cannot be empty' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Save to Redis
    const client = await getRedis();
    if (client) {
      const chatEntry = {
        userId,
        name: name.trim().slice(0, 12),
        message: sanitizedMessage,
        timestamp: timestamp || Date.now(),
      };

      // Store in a list (keep last 100 messages)
      await client.lpush('synthjam:chat', JSON.stringify(chatEntry));
      await client.ltrim('synthjam:chat', 0, 99); // Keep only last 100
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Chat save error:', error);
    return new Response(JSON.stringify({ error: 'Failed to save message' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

// Get recent chat messages
export const GET: APIRoute = async () => {
  try {
    const client = await getRedis();
    if (!client) {
      return new Response(JSON.stringify({ messages: [] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Get last 50 messages
    const messages = await client.lrange('synthjam:chat', 0, 49);
    const parsedMessages = messages
      .map((msg: string) => {
        try {
          return JSON.parse(msg);
        } catch {
          return null;
        }
      })
      .filter((msg: any) => msg !== null)
      .reverse(); // Most recent first

    return new Response(JSON.stringify({ messages: parsedMessages }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Chat fetch error:', error);
    return new Response(JSON.stringify({ messages: [] }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

