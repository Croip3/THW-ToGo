import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'
import vueDevTools from 'vite-plugin-vue-devtools'
import { VitePWA } from 'vite-plugin-pwa'

// GitHub Pages project page -> served from /THW-ToGo/, so all absolute
// paths (base, manifest start_url/scope, router history) must match.
const BASE_PATH = '/THW-ToGo/'

// https://vite.dev/config/
export default defineConfig({
  base: BASE_PATH,
  plugins: [
    vue(),
    vueJsx(),
    vueDevTools(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/*.png', 'favicon.png'],
      manifest: {
        id: BASE_PATH,
        name: 'THW Theorie-Trainer',
        short_name: 'THW ToGo',
        description: 'Offline-fähige Spaced-Repetition-App zum Lernen von THW-Theoriefragen.',
        lang: 'de',
        start_url: BASE_PATH,
        scope: BASE_PATH,
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#003399',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          {
            src: 'icons/icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // App shell + all static assets, including the question bank
        // (topics.json, bundled as a JS chunk via dynamic import, see
        // questionService.ts), the icons and the THW logo (webp) so the app
        // works fully offline after the first load.
        globPatterns: ['**/*.{js,css,html,svg,png,ico,webp,webmanifest}'],
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  css: {
    preprocessorOptions: {
      scss: {
        // Bootstrap 5.3's SCSS still uses color functions Dart Sass is deprecating;
        // quietDeps silences those (they come from node_modules, not our code).
        quietDeps: true,
      },
    },
  },
})
