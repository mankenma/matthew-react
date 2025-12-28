# Netlify Setup Guide for Leaderboard

## ✅ Current Status

Your site **will deploy automatically** on Netlify when you push to GitHub. However, the leaderboard needs a Redis database to work in production.

## 🚀 Quick Setup (5 minutes)

### Option 1: Upstash Redis (Recommended for Netlify)

1. **Create a free Upstash account**: https://upstash.com
   - Sign up (free tier is generous)
   - Create a new Redis database
   - Choose a region close to your users

2. **Get your credentials**:
   - Copy the `UPSTASH_REDIS_REST_URL`
   - Copy the `UPSTASH_REDIS_REST_TOKEN`

3. **Add to Netlify Environment Variables**:
   - Go to your Netlify site dashboard
   - Navigate to: **Site settings → Environment variables**
   - Add these two variables:
     - `UPSTASH_REDIS_REST_URL` = (your URL from Upstash)
     - `UPSTASH_REDIS_REST_TOKEN` = (your token from Upstash)

4. **Redeploy**:
   - Go to **Deploys** tab
   - Click **Trigger deploy** → **Clear cache and deploy site**

That's it! Your leaderboard will now work on Netlify.

---

## 🔄 How It Works

The code automatically detects which Redis service to use:

- **Upstash Redis** (if `UPSTASH_REDIS_REST_URL` is set) → Works on Netlify ✅
- **Vercel KV** (if `KV_REST_API_URL` is set) → Works on Vercel ✅
- **Local store** (if neither is set) → Works for local development ✅

---

## 🧪 Testing

After setup, test the leaderboard:

1. Visit your Netlify site
2. Navigate to the High Roller Tycoon game
3. Click "Global Ranking" button
4. Submit a test score
5. Verify it appears in the leaderboard

---

## 💰 Cost

- **Upstash Free Tier**: 10,000 commands/day (plenty for a leaderboard)
- **Netlify Free Tier**: Unlimited deployments

Both are free for your use case!

---

## 🆘 Troubleshooting

### Leaderboard shows "Failed to load"
- Check that environment variables are set in Netlify
- Verify the Upstash database is active
- Check Netlify build logs for errors

### Scores not saving
- Verify `UPSTASH_REDIS_REST_TOKEN` is correct
- Check that the token has write permissions
- Look at Netlify function logs

### Still not working?
- The code falls back to local store in development
- In production, it will show errors if Redis isn't configured
- Check browser console and Netlify function logs

---

## ✅ Alternative: Keep Using Local Store

If you don't want to set up Redis right now, the leaderboard will:
- ✅ Work in local development (uses in-memory store)
- ❌ Not persist in production (scores reset on each deploy)

For a production leaderboard, you need Redis (Upstash is the easiest option).

