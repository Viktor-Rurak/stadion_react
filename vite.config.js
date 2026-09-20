import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Налаштування Vite — інструмента, який запускає сайт під час розробки
// (npm run dev) і збирає його для публікації (npm run build).
export default defineConfig({
  plugins: [react()],
});
