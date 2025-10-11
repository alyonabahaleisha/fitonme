# GodLovesMe AI - Quick Start Guide

Get your virtual outfit try-on app running in 5 minutes!

## ⚡ Fast Setup

1. **Install dependencies**
```bash
npm install
npm install --prefix server
```

2. **Start both servers** (open 2 terminal windows)

Terminal 1 - Backend:
```bash
npm run server
```

Terminal 2 - Frontend:
```bash
npm run dev
```

3. **Open browser**
```
http://localhost:5173
```

That's it! 🎉

## 📝 First Steps

### Upload Your First Photo
1. Click "Get Started" on the homepage
2. Upload a full-height, front-facing photo
3. Wait for processing (1-2 seconds)

### Try On Outfits
1. Browse the carousel at the bottom
2. Tap any outfit to see it on your photo
3. Hold "Compare" to see before/after
4. Click the shuffle button for random outfits

### Add Your Own Outfits (Admin)
1. Click "Admin Access" on homepage
2. Upload outfit PNG images
3. Fill in name, category, tags
4. Click "Upload All"

## 🎨 Sample Outfits

The app comes with 5 sample outfit placeholders. To use real outfits:

1. Get outfit images with transparent backgrounds
2. Use the admin panel to upload them
3. Or manually add to `public/outfits/{category}/` folders

## 🔑 Optional: Enable AI Features

1. Get a free Gemini API key from [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create `.env` file:
```bash
cp .env.example .env
```
3. Add your key to `.env`:
```
VITE_GEMINI_API_KEY=your_key_here
```
4. Restart the dev server

## 🐛 Troubleshooting

**Port already in use?**
```bash
# Backend (change port in server/index.js)
# Frontend (run with custom port)
npm run dev -- --port 3000
```

**Images not loading?**
- Make sure backend server is running on port 3001
- Check console for CORS errors

**Outfit overlay not working?**
- Ensure outfit images have transparent backgrounds
- Check browser console for errors
- Try with a different photo (full height, front-facing works best)

## 📱 Test on Mobile

1. Find your local IP:
```bash
# Mac/Linux
ifconfig | grep "inet "

# Windows
ipconfig
```

2. Update vite config to allow network access (already configured)

3. Visit from your phone:
```
http://YOUR_IP:5173
```

## 🎯 What's Next?

- Add more outfits via admin panel
- Customize colors in `tailwind.config.js`
- Enable Gemini API for AI recommendations
- Deploy to production (Vercel/Netlify + Railway/Render)

## 📚 Need Help?

- Check the main [README.md](./README.md)
- Review component code in `src/components/`
- Check the API documentation in README

Happy styling! 👗✨
