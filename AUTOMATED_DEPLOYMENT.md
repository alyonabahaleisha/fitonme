# Automated Deployment with GitHub Actions

This guide shows you how to set up **completely automated deployments** using GitHub Actions. Every time you push to `main`, your app automatically deploys to production!

## 🚀 What Gets Automated

- ✅ Frontend deploys to Vercel
- ✅ Backend deploys to Render (or Railway)
- ✅ Build checks run before deployment
- ✅ Code linting (optional)
- ✅ Environment variables injected securely
- ✅ Zero manual deployment needed

---

## 📋 Prerequisites

1. GitHub repository (you already have this!)
2. Vercel account (free)
3. Render account (free) OR Railway account (free)
4. Supabase account with database setup
5. Google Gemini API key

---

## 🔧 Setup Instructions

### Step 1: Deploy Frontend to Vercel (One-time Setup)

1. Go to [vercel.com](https://vercel.com) and sign in with GitHub
2. Click **Add New Project**
3. Import your `fitonme` repository
4. Configure:
   - **Framework Preset**: Vite
   - **Root Directory**: `./`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
5. Add environment variables:
   ```
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
   VITE_GEMINI_API_KEY=your-gemini-api-key
   VITE_API_URL=https://your-backend.onrender.com
   ```
6. Click **Deploy** (this first deployment is manual)

7. After deployment, get your Vercel credentials:
   - Go to **Settings** → **General**
   - Copy **Project ID**
   - Go to your [Vercel Account Settings](https://vercel.com/account/tokens)
   - Create a new token, copy it
   - Your **Org ID** is in the URL: `vercel.com/<org-id>/...`

---

### Step 2: Deploy Backend to Render (One-time Setup)

1. Go to [render.com](https://render.com) and sign in with GitHub
2. Click **New** → **Web Service**
3. Connect your `fitonme` repository
4. Configure:
   - **Name**: `fitonme-backend`
   - **Region**: Choose closest to you
   - **Branch**: `main`
   - **Root Directory**: `server`
   - **Runtime**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `npm start` (or `node index.js`)
   - **Instance Type**: Free
5. Add environment variables:
   ```
   PORT=3001
   NODE_ENV=production
   ```
6. Click **Create Web Service**
7. Copy your backend URL (e.g., `https://fitonme-backend.onrender.com`)

8. Get your Render Deploy Hook:
   - In Render dashboard, go to your service
   - Click **Settings** → **Deploy Hook**
   - Click **Create Deploy Hook**
   - Copy the webhook URL (looks like: `https://api.render.com/deploy/srv_xxx?key=xxx`)

---

### Step 3: Add Secrets to GitHub

1. Go to your GitHub repository
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret** for each:

**Vercel Secrets:**
```
Name: VERCEL_TOKEN
Value: <your-vercel-token>

Name: VERCEL_ORG_ID
Value: <your-org-id>

Name: VERCEL_PROJECT_ID
Value: <your-project-id>
```

**Backend Secrets:**
```
Name: RENDER_DEPLOY_HOOK_URL
Value: <your-render-deploy-hook-url>
```

**Environment Variables:**
```
Name: VITE_SUPABASE_URL
Value: https://your-project.supabase.co

Name: VITE_SUPABASE_ANON_KEY
Value: <your-supabase-anon-key>

Name: VITE_GEMINI_API_KEY
Value: <your-gemini-api-key>

Name: VITE_API_URL
Value: https://fitonme-backend.onrender.com
```

---

### Step 4: Choose Your Workflow

We've created two workflows for you:

**Option A: Simple Workflow (Recommended)**
- File: `.github/workflows/deploy-simple.yml`
- Uses Render deploy hooks
- Easier to set up
- Just works™

**Option B: Advanced Workflow**
- File: `.github/workflows/deploy.yml`
- Includes code quality checks
- Supports Railway or Render
- More control

**To activate one:**
1. Delete the workflow you DON'T want to use
2. Or rename it to `.yml.disabled`

---

### Step 5: Update Backend URL in Vercel

1. Go back to Vercel project settings
2. Update `VITE_API_URL` to your Render backend URL
3. Redeploy from Vercel dashboard (one last time)

---

### Step 6: Point Your Domain (greendev.ai)

**In GoDaddy DNS Management:**

1. Add/Edit these DNS records:
   ```
   Type: CNAME
   Name: www
   Value: cname.vercel-dns.com
   TTL: 1 hour

   Type: A
   Name: @
   Value: 76.76.21.21
   TTL: 1 hour
   ```

2. In Vercel dashboard:
   - Go to **Settings** → **Domains**
   - Click **Add**
   - Enter `greendev.ai`
   - Click **Add**
   - Repeat for `www.greendev.ai`

3. Wait 24-48 hours for DNS propagation

---

## ✅ Test Your Setup

1. Make a small change to your code (e.g., update README.md)
2. Commit and push to main:
   ```bash
   git add .
   git commit -m "Test automated deployment"
   git push origin main
   ```
3. Go to your GitHub repository → **Actions** tab
4. Watch the workflow run live!
5. Once complete, check your Vercel URL - it should be updated!

---

## 🎯 Usage

From now on, every time you push to `main`:

1. GitHub Actions automatically runs
2. Code is linted and built
3. Frontend deploys to Vercel
4. Backend deploys to Render
5. Your site is live in ~2-3 minutes!

**No manual deployment needed!**

---

## 🔍 Monitoring

**Check deployment status:**
- GitHub: Repository → Actions tab
- Vercel: [vercel.com/dashboard](https://vercel.com/dashboard)
- Render: [dashboard.render.com](https://dashboard.render.com)

**View logs:**
- GitHub Actions: Click on any workflow run
- Vercel: Project → Deployments → Click deployment → View logs
- Render: Service → Logs tab

---

## 🐛 Troubleshooting

**Workflow fails with "Vercel token invalid"**
- Verify `VERCEL_TOKEN` secret is correct
- Generate a new token in Vercel settings

**Frontend builds but backend doesn't deploy**
- Check `RENDER_DEPLOY_HOOK_URL` is correct
- Verify webhook URL is active in Render dashboard

**Build fails with "Missing environment variable"**
- Ensure ALL secrets are added to GitHub
- Check secret names match exactly (case-sensitive)

**Backend URL returns 404**
- Wait a few minutes after first Render deployment
- Check Render service is running (not sleeping)
- Verify `VITE_API_URL` in Vercel matches your Render URL

**DNS not working after 48 hours**
- Verify DNS records in GoDaddy
- Check domain is added in Vercel settings
- Try clearing browser cache

---

## 🚀 Optional: Deploy on PR

Want to preview changes before merging? Update the workflow:

```yaml
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]  # This enables preview deployments
```

Vercel will automatically create preview URLs for pull requests!

---

## 💰 Cost Breakdown

**Free Tier (Recommended to start):**
- Vercel: Free (hobby plan)
- Render: Free (with sleep after 15min inactivity)
- GitHub Actions: Free (2,000 minutes/month)
- **Total: $0/month**

**Always-On (No sleep):**
- Vercel: Free
- Render: $7/month (starter plan)
- GitHub Actions: Free
- **Total: $7/month**

---

## 🔄 Alternative: Using Railway Instead of Render

If you prefer Railway over Render:

1. Go to [railway.app](https://railway.app)
2. New Project → Deploy from GitHub
3. Select your repository
4. Choose `server` as root directory
5. Add environment variables:
   ```
   PORT=3001
   NODE_ENV=production
   ```
6. Get your Railway token from settings
7. Add to GitHub secrets as `RAILWAY_TOKEN`
8. Use `.github/workflows/deploy.yml` instead of `deploy-simple.yml`
9. Uncomment the Railway deployment section

Railway costs $5/month but doesn't have the sleep issue.

---

## 📚 Additional Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Render Documentation](https://render.com/docs)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Railway Documentation](https://docs.railway.app)

---

## 🎉 Success!

You now have a fully automated CI/CD pipeline! Just code, commit, push, and watch your app deploy automatically.

**Questions?** Open an issue or check the troubleshooting section above.

---

**Happy deploying! 🚀**
