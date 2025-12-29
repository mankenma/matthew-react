import type { APIRoute } from 'astro';
import { Redis } from '@upstash/redis';
import { Resend } from 'resend';

// Initialize Redis client
const redis = new Redis({
  url: import.meta.env.UPSTASH_REDIS_REST_URL,
  token: import.meta.env.UPSTASH_REDIS_REST_TOKEN,
});

// Initialize Resend client
const resend = new Resend(import.meta.env.RESEND_API_KEY);

export const POST: APIRoute = async ({ request }) => {
  try {
    // Parse the JSON body to get name and score
    const body = await request.json();
    const { name, score } = body;

    // Validate input
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return new Response(JSON.stringify({ error: 'Invalid name' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (!Number.isFinite(score) || score < 0) {
      return new Response(JSON.stringify({ error: 'Invalid score' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Save the score to Upstash Redis using a Sorted Set
    await redis.zadd('leaderboard', { score: Number(score), member: name.trim() });

    // Send email notification immediately after successful Redis save
    // Sanitize name and score for HTML (escape special characters)
    const sanitizedName = name.trim()
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;');
    const sanitizedScore = String(score).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    
    await resend.emails.send({
      from: 'onboarding@resend.dev',
      to: 'matthewankenmann@gmail.com',
      subject: `New Leaderboard Update: ${sanitizedName}`,
      html: `<p>User <strong>${sanitizedName}</strong> just submitted a score of <strong>${sanitizedScore}</strong>.</p>`
    });

    // Return success response
    return new Response(JSON.stringify({ success: true, message: 'Score saved and notification sent' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    // Return error response
    return new Response(JSON.stringify({ 
      error: 'Failed to process request', 
      message: error?.message || 'Unknown error' 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

