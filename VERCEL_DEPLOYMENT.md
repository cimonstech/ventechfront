# 🚀 Vercel Deployment Guide

## Prerequisites

1. **Vercel Account**: Sign up at [vercel.com](https://vercel.com)
2. **GitHub Repository**: Your code should be pushed to GitHub
3. **Environment Variables**: Ready to configure

## Required Environment Variables

Add these in Vercel Dashboard → Project Settings → Environment Variables:

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_API_URL=your_backend_api_url (e.g., https://your-app.railway.app)
```
##
## Deployment Methods

### Method 1: Via Vercel Dashboard (Recommended)

1. Go to [vercel.com](https://vercel.com)
2. Click "Add New" → "Project"
3. Import your GitHub repository
4. Configure:
   - **Framework Preset**: Next.js
   - **Root Directory**: `frontend` (if monorepo) or leave empty if standalone
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next`
5. Add Environment Variables (see above)
6. Click "Deploy"

### Method 2: Via Vercel CLI

```bash
cd frontend
npx vercel
```

Follow the prompts:
- Link to existing project or create new
- Set up environment variables
- Deploy

### Method 3: Production Deployment

```bash
cd frontend
npx vercel --prod
```

## Post-Deployment Checklist

- [ ] Test homepage loads
- [ ] Test authentication (login/register)
- [ ] Test admin panel access
- [ ] Test API connectivity
- [ ] Test image uploads
- [ ] Test banner management
- [ ] Verify environment variables are set correctly

## Custom Domain Setup

1. In Vercel Dashboard → Project Settings → Domains
2. Add your domain
3. Follow DNS instructions
4. Update Cloudflare DNS if using Cloudflare

## Troubleshooting

### Build Fails
- Check Node.js version (should be 18.x or 20.x)
- Verify all dependencies are in `package.json`
- Check build logs for errors

### Environment Variables Not Working
- Ensure variables start with `NEXT_PUBLIC_` for client-side access
- Redeploy after adding new variables
- Check variable names match exactly

### API Connection Issues
- Verify `NEXT_PUBLIC_API_URL` is correct
- Ensure backend CORS allows Vercel domain
- Check backend is deployed and running

