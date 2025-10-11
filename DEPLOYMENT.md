# GodLovesMe AI - Deployment Guide

Deploy your virtual outfit try-on app to production.

## 🌐 Deployment Options

### Option 1: Vercel (Frontend) + Railway (Backend) - Recommended

**Frontend on Vercel:**

1. Push code to GitHub
2. Go to [vercel.com](https://vercel.com)
3. Import your repository
4. Configure:
   - Framework Preset: Vite
   - Build Command: `npm run build`
   - Output Directory: `dist`
5. Add environment variables:
   ```
   VITE_GEMINI_API_KEY=your_key
   VITE_API_URL=https://your-backend.railway.app
   ```
6. Deploy!

**Backend on Railway:**

1. Go to [railway.app](https://railway.app)
2. New Project → Deploy from GitHub
3. Select your repo, choose `server/` as root directory
4. Add environment variable:
   ```
   PORT=3001
   ```
5. Railway will auto-deploy from `server/index.js`

### Option 2: Netlify (Frontend) + Render (Backend)

**Frontend on Netlify:**

1. Push to GitHub
2. Go to [netlify.com](https://netlify.com)
3. New site from Git
4. Build settings:
   - Build command: `npm run build`
   - Publish directory: `dist`
5. Environment variables:
   ```
   VITE_GEMINI_API_KEY=your_key
   VITE_API_URL=https://your-backend.onrender.com
   ```

**Backend on Render:**

1. Go to [render.com](https://render.com)
2. New → Web Service
3. Connect your repo
4. Settings:
   - Root Directory: `server`
   - Build Command: `npm install`
   - Start Command: `npm start`
5. Add environment variable:
   ```
   PORT=3001
   ```

### Option 3: Single VPS (DigitalOcean, Linode, etc.)

1. **Create a droplet/server** (Ubuntu 22.04 recommended)

2. **SSH into server and setup:**
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install PM2 for process management
sudo npm install -g pm2

# Install Nginx
sudo apt install -y nginx
```

3. **Clone and setup app:**
```bash
cd /var/www
git clone <your-repo> godlovesme-ai
cd godlovesme-ai

# Install dependencies
npm install
npm install --prefix server

# Build frontend
npm run build

# Setup environment
cp .env.example .env
nano .env  # Add your keys
```

4. **Start backend with PM2:**
```bash
pm2 start server/index.js --name godlovesme-api
pm2 save
pm2 startup
```

5. **Configure Nginx:**
```bash
sudo nano /etc/nginx/sites-available/godlovesme-ai
```

Add:
```nginx
server {
    listen 80;
    server_name your-domain.com;

    # Frontend
    location / {
        root /var/www/godlovesme-ai/dist;
        try_files $uri $uri/ /index.html;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Serve outfit images
    location /outfits {
        root /var/www/godlovesme-ai/public;
    }
}
```

Enable and restart:
```bash
sudo ln -s /etc/nginx/sites-available/godlovesme-ai /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

6. **Setup SSL with Let's Encrypt:**
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

## 🔒 Environment Variables for Production

### Frontend (.env)
```env
VITE_GEMINI_API_KEY=your_production_gemini_key
VITE_API_URL=https://api.your-domain.com
```

### Backend (server/.env or platform variables)
```env
PORT=3001
NODE_ENV=production
```

## 📦 Pre-Deployment Checklist

- [ ] Test build locally: `npm run build`
- [ ] Test production build: `npm run preview`
- [ ] Verify all API endpoints work
- [ ] Add real outfit images to `public/outfits/`
- [ ] Test image uploads in admin panel
- [ ] Verify Gemini API integration (if using)
- [ ] Test on mobile devices
- [ ] Setup error tracking (Sentry, etc.)
- [ ] Configure CORS for production domain
- [ ] Setup CDN for outfit images (Cloudinary, etc.)
- [ ] Add analytics (Google Analytics, Plausible)

## 🎯 Production Optimizations

### 1. Image Optimization
Use a CDN like Cloudinary for outfit images:

```javascript
// Update outfit URLs to use CDN
const outfit = {
  imageUrl: 'https://res.cloudinary.com/your-cloud/image/upload/outfits/dress-1.png',
  thumbnailUrl: 'https://res.cloudinary.com/your-cloud/image/upload/w_200,h_300/outfits/dress-1.png'
}
```

### 2. Database Integration
Replace in-memory storage with a database:

**MongoDB:**
```bash
npm install --prefix server mongodb mongoose
```

**PostgreSQL:**
```bash
npm install --prefix server pg
```

### 3. Caching
Add Redis for caching processed images:

```bash
npm install --prefix server redis
```

### 4. Rate Limiting
Protect your API:

```bash
npm install --prefix server express-rate-limit
```

```javascript
// server/index.js
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

app.use('/api/', limiter);
```

## 🔍 Monitoring

### Production Logging
```bash
# Install Winston for better logging
npm install --prefix server winston
```

### Error Tracking
Setup Sentry:
```bash
npm install @sentry/react @sentry/node
```

## 🚀 CI/CD Pipeline

### GitHub Actions (.github/workflows/deploy.yml)

```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: npm install
      - run: npm run build
      - run: npm test # If you have tests
      # Deploy to your hosting provider
```

## 📊 Performance Targets

- **Lighthouse Score**: 90+ for all metrics
- **First Contentful Paint**: < 1.5s
- **Time to Interactive**: < 3.5s
- **Outfit Switch Time**: < 300ms
- **Image Upload**: < 3s for 5MB image

## 🆘 Troubleshooting Production

**CORS errors:**
Update server/index.js:
```javascript
app.use(cors({
  origin: ['https://your-domain.com', 'https://www.your-domain.com']
}));
```

**Large bundle size:**
Enable code splitting and lazy loading

**Slow image processing:**
- Use Web Workers for canvas processing
- Implement server-side image processing
- Use CDN for outfit images

**Memory issues:**
- Clear cache periodically
- Implement LRU cache with max size
- Use server-side caching with Redis

## 📝 Post-Deployment

1. Test all features in production
2. Monitor error logs
3. Check performance metrics
4. Setup uptime monitoring (UptimeRobot, etc.)
5. Configure backups for outfit images
6. Setup automated database backups (if using)
7. Document admin procedures
8. Train admin users on outfit upload process

---

Need help? Check the main [README.md](./README.md) or open an issue!
