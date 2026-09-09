import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Frontend mluví s API přes stejný původ, takže není potřeba řešit CORS.
    proxy: { '/api': 'http://127.0.0.1:3000' },
  },
});
