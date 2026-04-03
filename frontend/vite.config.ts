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
  },
})
