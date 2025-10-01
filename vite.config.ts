import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/SmartQuizHub/',
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
});
