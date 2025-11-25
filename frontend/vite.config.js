import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react()],
    server: {
        proxy: {
            '/api/v1/ocr': {
                target: 'http://localhost:8001',
                changeOrigin: true,
            },
            '/api/v1/chat': {
                target: 'http://localhost:8003',
                changeOrigin: true,
            }
        }
    }
})
