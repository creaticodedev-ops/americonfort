import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    target: 'es2020',
    cssCodeSplit: true,
    modulePreload: {
      resolveDependencies: (_filename, deps) =>
        deps.filter((dep) => {
          const name = dep.toLowerCase()
          return !(
            name.includes('owner') ||
            name.includes('superadmin') ||
            name.includes('phone') ||
            name.includes('reservation') ||
            name.includes('admintranslations') ||
            name.includes('manage') ||
            name.includes('dashboard') ||
            name.includes('walkin') ||
            name.includes('completebooking')
          )
        }),
    },
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return
          // Keep phone UI/CSS out of shared chunks so they stay with lazy routes.
          if (id.includes('libphonenumber') || id.includes('react-phone-number-input')) {
            return
          }
          if (id.includes('react-dom') || id.includes('react-router') || id.includes('/react/')) {
            return 'vendor-react'
          }
          if (id.includes('framer-motion') || id.includes('/motion/')) {
            return 'vendor-motion'
          }
          if (id.includes('axios')) {
            return 'vendor-axios'
          }
        },
      },
    },
  },
  server: {
    proxy: {
      '/api': {
        target: process.env.VITE_API_PROXY_TARGET || 'http://localhost:3000',
        changeOrigin: true,
      },
    },
    watch: {
      ignored: ['**/src/assets/**/logo (1).svg', '**/logo (1).svg'],
    },
  },
})
