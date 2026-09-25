/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base is '/' for local dev. When you later deploy to GitHub Pages under a
// repo subpath, build with:  VITE_BASE=/poject-w/ npm run build
// Nothing else needs to change — the app uses HashRouter.
export default defineConfig({
  base: process.env.VITE_BASE || '/',
  plugins: [react()],
  server: { port: 5173, open: true },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
