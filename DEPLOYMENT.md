# Deployment Guide for Album Tracker

This guide explains how to deploy Album Tracker to various hosting platforms.

## Quick Deploy Options

Album Tracker is a static web application built with Vite + React. You can deploy it to:

1. **Firebase Hosting** (Recommended - easy integration with Firebase sync)
2. **Netlify** (Simple, free, automatic deployments)
3. **Vercel** (Fast, free, optimized for React)
4. **GitHub Pages** (Free, directly from your repository)

---

## Option 1: Firebase Hosting (Recommended)

### Prerequisites
- Firebase project set up (see FIREBASE_SETUP.md)
- Firebase CLI installed: `npm install -g firebase-tools`

### Steps

1. **Login to Firebase**
   ```bash
   firebase login
   ```

2. **Initialize Firebase Hosting**
   ```bash
   firebase init hosting
   ```
   
   When prompted:
   - Select your existing Firebase project
   - Set public directory: `dist`
   - Configure as single-page app: `Yes`
   - Set up automatic builds with GitHub: `No` (or `Yes` if you want CI/CD)
   - Don't overwrite `dist/index.html`: `No`

3. **Build your app**
   ```bash
   npm run build
   ```

4. **Deploy**
   ```bash
   firebase deploy --only hosting
   ```

5. **Access your app**
   - Your app will be available at: `https://YOUR-PROJECT-ID.web.app`
   - Custom domain can be configured in Firebase Console

### Updating Your Deployment

```bash
npm run build
firebase deploy --only hosting
```

---

## Option 2: Netlify

### Method A: Deploy via Netlify UI (Easiest)

1. Go to [Netlify](https://www.netlify.com/)
2. Sign up/Login with GitHub
3. Click "Add new site" → "Import an existing project"
4. Connect to your GitHub repository
5. Configure build settings:
   - Build command: `npm run build`
   - Publish directory: `dist`
6. Click "Deploy"

### Method B: Deploy via Netlify CLI

1. **Install Netlify CLI**
   ```bash
   npm install -g netlify-cli
   ```

2. **Build your app**
   ```bash
   npm run build
   ```

3. **Deploy**
   ```bash
   netlify deploy --prod --dir=dist
   ```

---

## Option 3: Vercel

### Method A: Deploy via Vercel UI

1. Go to [Vercel](https://vercel.com/)
2. Sign up/Login with GitHub
3. Click "Add New" → "Project"
4. Import your GitHub repository
5. Configure:
   - Framework Preset: Vite
   - Build command: `npm run build`
   - Output directory: `dist`
6. Click "Deploy"

### Method B: Deploy via Vercel CLI

1. **Install Vercel CLI**
   ```bash
   npm install -g vercel
   ```

2. **Deploy**
   ```bash
   vercel --prod
   ```

---

## Option 4: GitHub Pages

1. **Install gh-pages package**
   ```bash
   npm install --save-dev gh-pages
   ```

2. **Update package.json**
   
   Add to `package.json`:
   ```json
   {
     "homepage": "https://YOUR-USERNAME.github.io/AlbumTracker",
     "scripts": {
       "predeploy": "npm run build",
       "deploy": "gh-pages -d dist"
     }
   }
   ```

3. **Update vite.config.js**
   
   Add base path:
   ```javascript
   export default {
     base: '/AlbumTracker/',
     // ... rest of config
   }
   ```

4. **Deploy**
   ```bash
   npm run deploy
   ```

5. **Enable GitHub Pages**
   - Go to repository Settings → Pages
   - Source: Deploy from branch `gh-pages`
   - Save

---

## Using the Deploy Branch

A special `deploy` branch has been created with only the essential files needed for deployment. This branch:

- Contains only production-ready files
- Automatically syncs with the main branch
- Excludes development files and dependencies
- Is optimized for deployment

### Deploying from the Deploy Branch

1. **Clone the deploy branch**
   ```bash
   git clone -b deploy https://github.com/YOUR-USERNAME/AlbumTracker.git album-tracker-deploy
   cd album-tracker-deploy
   ```

2. **Install production dependencies only**
   ```bash
   npm install --production
   ```

3. **Build**
   ```bash
   npm run build
   ```

4. **Deploy using any method above**

---

## Environment Variables

If you need to set environment variables (e.g., API keys):

### For Netlify/Vercel
- Add them in the dashboard under "Environment Variables"

### For Firebase Hosting
- Use Firebase Functions or store in Firestore

### For GitHub Pages
- Keep sensitive data out of the repository
- Use Firebase config loaded at runtime

---

## Custom Domain Setup

### Firebase Hosting
1. Go to Firebase Console → Hosting
2. Click "Add custom domain"
3. Follow the DNS configuration steps

### Netlify
1. Go to Site settings → Domain management
2. Add custom domain
3. Update DNS records

### Vercel
1. Go to Project settings → Domains
2. Add domain
3. Configure DNS

---

## Mobile Access

After deployment, your app will be accessible from any device with a web browser:

### On Android
1. Open your deployed URL in Chrome/Firefox
2. Tap the menu (⋮) → "Add to Home screen"
3. The app will work like a native app!

### Progressive Web App (PWA)
To make your app installable:
1. Add a `manifest.json` file
2. Add a service worker
3. Users can install it as a PWA on both desktop and mobile

---

## Continuous Deployment

### Automatic Deployments with GitHub Actions

For Firebase Hosting, Netlify, or Vercel, you can set up automatic deployments:

1. Every push to `main` triggers a build
2. Successful builds deploy automatically
3. Configure in your hosting provider's settings

---

## Monitoring and Analytics

After deployment:
- Use Firebase Analytics for usage tracking
- Set up error monitoring with Sentry or LogRocket
- Monitor performance with Lighthouse

---

## Troubleshooting

### Build Fails
- Check Node.js version compatibility
- Clear node_modules and reinstall: `rm -rf node_modules && npm install`
- Check for missing dependencies

### 404 Errors on Refresh
- Configure your hosting for single-page apps
- Ensure all routes redirect to `index.html`

### Firebase Connection Issues
- Verify Firebase config is correct
- Check security rules
- Ensure Authentication is enabled

---

## Cost Considerations

### Free Tiers
- **Firebase Hosting**: 10 GB storage, 360 MB/day bandwidth
- **Netlify**: 100 GB bandwidth/month
- **Vercel**: 100 GB bandwidth/month
- **GitHub Pages**: 100 GB bandwidth/month (soft limit)

All options are free for small to medium-sized projects!

---

## Need Help?

- Check the hosting provider's documentation
- Review build logs for errors
- Verify your Firebase configuration
- Test locally first: `npm run build && npm run preview`

---

**Happy deploying!** 🚀
