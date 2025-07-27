import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base:
    process.env.GITHUB_PAGES === 'true'
      ? '/splatoon3-schedule-notificator/'
      : '/',
  server: {
    port: 3000,
  },
});
