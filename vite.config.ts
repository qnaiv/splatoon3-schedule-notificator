import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,json}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*\.github\.io\/.*\/api\/.*\.json$/,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'schedule-api-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 2 // 2時間
              }
            }
          }
        ]
      },
      manifest: {
        name: 'スプラトゥーン3 スケジュール通知',
        short_name: 'Splatoon3 通知',
        description: 'スプラトゥーン3のスケジュール確認と通知アプリ',
        theme_color: '#1a202c',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        scope: process.env.NODE_ENV === 'production' ? '/splatoon3-schedule-notificator/' : '/',
        start_url: process.env.NODE_ENV === 'production' ? '/splatoon3-schedule-notificator/' : '/',
        icons: [
          {
            src: `${process.env.NODE_ENV === 'production' ? '/splatoon3-schedule-notificator' : ''}/icons/icon-72x72.png`,
            sizes: '72x72',
            type: 'image/png'
          },
          {
            src: `${process.env.NODE_ENV === 'production' ? '/splatoon3-schedule-notificator' : ''}/icons/icon-96x96.png`,
            sizes: '96x96',
            type: 'image/png'
          },
          {
            src: `${process.env.NODE_ENV === 'production' ? '/splatoon3-schedule-notificator' : ''}/icons/icon-128x128.png`,
            sizes: '128x128',
            type: 'image/png'
          },
          {
            src: `${process.env.NODE_ENV === 'production' ? '/splatoon3-schedule-notificator' : ''}/icons/icon-144x144.png`,
            sizes: '144x144',
            type: 'image/png'
          },
          {
            src: `${process.env.NODE_ENV === 'production' ? '/splatoon3-schedule-notificator' : ''}/icons/icon-152x152.png`,
            sizes: '152x152',
            type: 'image/png'
          },
          {
            src: `${process.env.NODE_ENV === 'production' ? '/splatoon3-schedule-notificator' : ''}/icons/icon-192x192.png`,
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: `${process.env.NODE_ENV === 'production' ? '/splatoon3-schedule-notificator' : ''}/icons/icon-384x384.png`,
            sizes: '384x384',
            type: 'image/png'
          },
          {
            src: `${process.env.NODE_ENV === 'production' ? '/splatoon3-schedule-notificator' : ''}/icons/icon-512x512.png`,
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ],
  base: process.env.NODE_ENV === 'production' ? '/splatoon3-schedule-notificator/' : '/',
  server: {
    port: 3000
  }
})