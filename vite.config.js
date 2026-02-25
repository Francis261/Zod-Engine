import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 5173,
    // Allow all hosts so cloud preview/proxy domains can access the dev server.
    // This resolves blocked-host errors (e.g. onrender.com preview domains).
    allowedHosts: true
  }
});
