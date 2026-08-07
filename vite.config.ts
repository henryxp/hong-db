import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  // Use a relative base so the site works at any sub-path (e.g. GitHub Pages
  // project page https://henryxp.github.io/hong-db/). All asset URLs emitted
  // by Vite become relative to the current document, so /public assets must
  // also be referenced with relative paths (e.g. "./logo.png").
  base: './',
  plugins: [
    react(),
    tailwindcss(),
  ],
})
