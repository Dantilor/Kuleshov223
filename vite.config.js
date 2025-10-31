import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    emptyOutDir: true,
    rollupOptions: {
      external: ['/src/workers/convolutionWorker.ts'],
      output: {
        manualChunks: {
          mui: ['@mui/material', '@mui/icons-material'],
        },
        format: 'esm'
      }
    },
    worker: {
      format: 'es'
    }
  },
  base: './',
  worker: {
    format: 'es'
  },
  optimizeDeps: {
    exclude: ['workers/convolutionWorker.ts'],
  },
})