import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  // Project-page base: served at https://henryxp.github.io/hong-db/
  base: '/hong-db/',
  plugins: [
    react(),
    tailwindcss(),
  ],
})
