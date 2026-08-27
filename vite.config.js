import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: './', // Relative paths, required for loading over file:// in the production build
  server: { port: 5273, strictPort: true },
  build: { outDir: 'dist', emptyOutDir: true, chunkSizeWarningLimit: 1500 },
})
