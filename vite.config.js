import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 5173,
    // Explicit allow-list for remote preview domains.
    // Includes the requested Render host to resolve blocked request errors.
    allowedHosts: ['zod-engine.onrender.com', 'localhost', '127.0.0.1']
  }
});
