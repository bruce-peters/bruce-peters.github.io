import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  // PORT lets the Claude preview assign a free port when another session
  // already holds 5174; plain `npm run dev` still lands on 5174.
  server: {
    port: Number(process.env.PORT) || 5174,
  },
})
