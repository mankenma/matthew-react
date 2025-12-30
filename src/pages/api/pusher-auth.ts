import type { APIRoute } from 'astro';
import Pusher from 'pusher';
import filter from 'leo-profanity';

// Initialize Pusher server instance
function getPusher() {
  const appId = import.meta.env.PUSHER_APP_ID;
  const key = import.meta.env.PUSHER_KEY;
  const secret = import.meta.env.PUSHER_SECRET;
  const cluster = import.meta.env.PUSHER_CLUSTER || 'us2';

  if (!appId || !key || !secret) {
    throw new Error('Pusher credentials not configured');
  }

  return new Pusher({
    appId,
    key,
    secret,
    cluster,
    useTLS: true,
  });
}

// Helper: Sanitize username
function sanitizeUsername(username: string): string {
  // Trim and limit to 12 characters
  let sanitized = username.trim().slice(0, 12);
  
  // Check for profanity using leo-profanity
  if (filter.check(sanitized)) {
    // Replace profanity with asterisks
    sanitized = filter.clean(sanitized);
  }
  
  // Block all-caps usernames (if they contain letters)
  if (sanitized !== sanitized.toLowerCase() && sanitized === sanitized.toUpperCase() && /[a-zA-Z]/.test(sanitized)) {
    // Convert to title case as fallback
    sanitized = sanitized.charAt(0).toUpperCase() + sanitized.slice(1).toLowerCase();
  }
  
  // Ensure non-empty
  if (!sanitized || sanitized.length === 0) {
    sanitized = 'Player' + Math.floor(Math.random() * 1000);
  }
  
  return sanitized;
}

// Helper: Generate unique user ID
function generateUserId(): string {
  return 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { socket_id, channel_name, user_name } = body;
    
    console.log('Pusher auth request:', { socket_id, channel_name, user_name });

    // Validate required fields
    if (!socket_id || typeof socket_id !== 'string') {
      return new Response(JSON.stringify({ error: 'Invalid socket_id' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!channel_name || typeof channel_name !== 'string') {
      return new Response(JSON.stringify({ error: 'Invalid channel_name' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!user_name || typeof user_name !== 'string' || user_name.trim().length === 0) {
      return new Response(JSON.stringify({ error: 'Invalid user_name' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Sanitize username
    const sanitizedName = sanitizeUsername(user_name);
    
    // Generate unique user ID
    const userId = generateUserId();

    // Prepare user_info for Presence channel
    const userInfo = {
      name: sanitizedName,
      vote: 'grand_piano', // Default initial vote
    };

    // Get Pusher instance and authenticate
    const pusher = getPusher();
    
    // For presence channels, manually construct the auth response
    // authorizeChannel returns just the auth string, we need to add channel_data
    const presenceData = {
      user_id: userId,
      user_info: userInfo,
    };
    
    // Get the auth signature
    const auth = pusher.authorizeChannel(socket_id, channel_name);
    
    // Construct channel_data as JSON string for presence channels
    const channelData = JSON.stringify(presenceData);
    
    // Return both auth and channel_data
    return new Response(JSON.stringify({
      auth: auth,
      channel_data: channelData,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Pusher auth error:', error);
    console.error('Error stack:', error.stack);
    console.error('Environment check:', {
      hasAppId: !!import.meta.env.PUSHER_APP_ID,
      hasKey: !!import.meta.env.PUSHER_KEY,
      hasSecret: !!import.meta.env.PUSHER_SECRET,
    });
    return new Response(JSON.stringify({ 
      error: 'Authentication failed', 
      message: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

