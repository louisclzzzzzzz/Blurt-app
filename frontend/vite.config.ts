import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      // Précache uniquement l'app shell (JS/CSS/HTML/icônes) pour
      // l'installabilité et un chargement rapide. Pas de runtimeCaching sur
      // l'API backend : V1 est en ligne uniquement, les appels réseau vers
      // /api doivent toujours passer par le réseau, jamais depuis un cache.
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg,ico}'],
        // Les images de contenu (public/images/**) ne sont pas précachées :
        // certaines dépassent la limite Workbox de 2 MiB par fichier, ce qui
        // fait échouer le build. Elles ne sont pas nécessaires à l'app shell
        // offline et restent chargées à la demande via le réseau normal.
        globIgnores: ['images/**'],
      },
      manifest: {
        name: 'Vox App — suivi sportif vocal',
        short_name: 'Vox App',
        description: 'Suivi alimentation, activité et musculation par dictée vocale',
        theme_color: '#171717',
        background_color: '#171717',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: '/icons/maskable-icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
    }),
  ],
})
