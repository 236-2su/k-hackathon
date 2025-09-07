import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true
      }
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: false
  },
  // 프로덕션에서는 nginx가 프록시 처리하므로 별도 API 프록시 불필요
  define: {
    __API_URL__: JSON.stringify('/api')
  }
})
