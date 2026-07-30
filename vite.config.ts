import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'

// Deployed to GitHub Pages under /intuitive-relation-sketching/.
// https://vite.dev/config/
export default defineConfig({
  base: '/intuitive-relation-sketching/',
  plugins: [svelte()],
})
