# 🚀 Deployment Guide - Go Live with Your Portfolio!

Your code is now on GitHub at: `https://github.com/mankenma/matthew-react`

## Option 1: Vercel (Recommended - Easiest & Free)

Vercel is the best option for Astro sites. It's free, fast, and super easy.

### Steps:

1. **Go to Vercel**: https://vercel.com
2. **Sign up/Login** with your GitHub account
3. **Click "Add New Project"**
4. **Import your repository**: Select `matthew-react` from your GitHub repos
5. **Configure**:
   - Framework Preset: **Astro** (should auto-detect)
   - Root Directory: `./` (leave as is)
   - Build Command: `npm run build` (should be auto-filled)
   - Output Directory: `dist` (should be auto-filled)
6. **Click "Deploy"**

That's it! Your site will be live in ~2 minutes at a URL like:
`https://matthew-react.vercel.app`

### Custom Domain (Optional):
- In Vercel dashboard, go to your project → Settings → Domains
- Add your custom domain (e.g., `matthewankenmann.com`)

---

## Option 2: Netlify (Also Great & Free)

1. **Go to Netlify**: https://netlify.com
2. **Sign up/Login** with GitHub
3. **Click "Add new site" → "Import an existing project"**
4. **Select your GitHub repo**: `matthew-react`
5. **Build settings** (should auto-detect):
   - Build command: `npm run build`
   - Publish directory: `dist`
6. **Click "Deploy site"**

Your site will be live at: `https://random-name.netlify.app`

---

## Option 3: GitHub Pages (Free but requires setup)

1. **Install the gh-pages package**:
   ```bash
   npm install --save-dev gh-pages
   ```

2. **Add to package.json scripts**:
   ```json
   "deploy": "npm run build && gh-pages -d dist"
   ```

3. **Deploy**:
   ```bash
   npm run deploy
   ```

4. **Enable GitHub Pages**:
   - Go to your repo on GitHub
   - Settings → Pages
   - Source: `gh-pages` branch
   - Your site will be at: `https://mankenma.github.io/matthew-react`

---

## ✅ Post-Deployment Checklist

After deploying, test:

- [ ] Homepage loads correctly
- [ ] Blog button navigates to game
- [ ] Game loads and works
- [ ] Audio file loads (`/chaching.mp3`)
- [ ] Back button works
- [ ] All assets load (fonts, images)
- [ ] Mobile responsive works
- [ ] No console errors

---

## 🔧 Troubleshooting

### If audio doesn't work:
- Check that `chaching.mp3` is in the `public/` folder
- Verify the file path in browser Network tab

### If build fails:
- Check Vercel/Netlify build logs
- Ensure `node_modules` is in `.gitignore`
- Verify all dependencies are in `package.json`

### If routes don't work:
- Make sure you're using Astro's file-based routing
- Check that pages are in `src/pages/`

---

## 📝 Recommended: Vercel

**Why Vercel?**
- ✅ Zero configuration needed
- ✅ Automatic HTTPS
- ✅ Global CDN
- ✅ Free tier is generous
- ✅ Perfect for Astro
- ✅ Automatic deployments on git push

**Your site will auto-deploy** every time you push to GitHub!

---

## 🎉 You're Live!

Once deployed, share your URL and enjoy your live portfolio with the High Roller Tycoon easter egg!

