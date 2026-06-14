import { defineConfig } from 'vite'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { VitePWA } from 'vite-plugin-pwa'
import { viteStaticCopy } from 'vite-plugin-static-copy'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

export default defineConfig({
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['pwa-192x192.svg', 'pwa-512x512.svg'],
      manifest: {
        name: 'Silence Tools - 工具集合',
        short_name: 'Silence Tools',
        description: '实用工具集合，提升工作效率',
        theme_color: '#667eea',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/',
        icons: [
          {
            src: 'pwa-192x192.svg',
            sizes: '192x192',
            type: 'image/svg+xml'
          },
          {
            src: 'pwa-512x512.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'any'
          },
          {
            src: 'pwa-512x512.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'maskable'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,json}']
      }
    }),
    viteStaticCopy({
      targets: [
        { src: 'tools/gold-price/auth.js', dest: 'tools/gold-price' },
        { src: 'tools/gold-price/auth.js', dest: 'tools/expense-tracker' },
        { src: 'tools/gold-price/auth.js', dest: '.' }
      ]
    })
  ],
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        goldPrice: resolve(__dirname, 'tools/gold-price/index.html'),
        expenseTracker: resolve(__dirname, 'tools/expense-tracker/index.html')
      }
    }
  }
})