// Centralized configuration for the application

// API URL configuration
// In production, use the Render backend URL if VITE_API_URL is not set
// In development, default to localhost
export const API_URL = import.meta.env.VITE_API_URL ||
    (import.meta.env.PROD ? 'https://fitonme-backend.onrender.com' : 'http://localhost:3001');

export const STRIPE_PUBLISHABLE_KEY = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
