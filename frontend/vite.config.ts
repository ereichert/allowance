import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    watch: {
      // Docker bind mounts on macOS (Colima) do not propagate inotify events
      // into the container. Polling ensures Vite detects host file changes.
      usePolling: true,
    },
    // Vite's DNS-rebinding protection rejects requests whose Host header it
    // doesn't recognize. A Playwright browser running inside the dev container
    // reaches this server via the compose-network hostname, not localhost.
    allowedHosts: ['frontend'],
    proxy: {
      // Proxied server-side so the same relative API path resolves correctly
      // whether the page is loaded from a host browser (localhost:5173) or a
      // browser running inside the dev container (frontend:5173) — the browser
      // never needs to know the backend's address.
      '/api': {
        target: 'http://backend:3000',
        changeOrigin: true,
      },
    },
  },
})
