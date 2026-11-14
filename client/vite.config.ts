import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
// @ts-ignore - types resolved by bundler
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/api': 'http://localhost:3001'
    }
  }
})
