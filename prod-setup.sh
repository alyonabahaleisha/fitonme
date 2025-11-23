#!/bin/bash

# Production Setup Script for FitOnMe

echo "🚀 Starting Production Setup..."

# 1. Check Environment Variables
echo "Checking environment variables..."
if [ -z "$VITE_SUPABASE_URL" ]; then
  echo "❌ VITE_SUPABASE_URL is missing"
else
  echo "✅ VITE_SUPABASE_URL is set"
fi

if [ -z "$VITE_STRIPE_PUBLISHABLE_KEY" ]; then
  echo "❌ VITE_STRIPE_PUBLISHABLE_KEY is missing"
else
  echo "✅ VITE_STRIPE_PUBLISHABLE_KEY is set"
fi

# 2. Build Frontend
echo "Building frontend..."
npm install
npm run build

# 3. Setup Backend
echo "Setting up backend..."
cd server
npm install
cd ..

echo "✅ Setup complete! Ready for deployment."
echo "To deploy to Render (Backend):"
echo "  - Connect your repo to Render"
echo "  - Create a Web Service"
echo "  - Root Directory: server"
echo "  - Build Command: npm install"
echo "  - Start Command: node index.js"
echo "  - Add Environment Variables from .env"

echo "To deploy to Vercel (Frontend):"
echo "  - Connect your repo to Vercel"
echo "  - Framework Preset: Vite"
echo "  - Build Command: npm run build"
echo "  - Output Directory: dist"
echo "  - Add Environment Variables from .env"
