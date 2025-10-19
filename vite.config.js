import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // Allow network access for mobile testing
    port: 3000, // Different port from admin (which uses 5173)
    strictPort: false,
  },
})
