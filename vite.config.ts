import { defineConfig } from 'vite'

export default defineConfig({
  root: 'src',
  envDir: '..',
  publicDir: '../public',
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    rollupOptions: {
      input: 'src/index.html',
    },
  },
  css: {
    preprocessorOptions: {
      scss: {},
    },
  },
  // served in Docker behind an external reverse proxy
  preview: {
    host: true,
    port: 4173,
    allowedHosts: true,
  },
})
