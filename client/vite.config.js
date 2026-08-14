import process from 'node:process'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const gscVerification = (process.env.VITE_GSC_VERIFICATION || '').trim()
const ga4Id = (process.env.VITE_GA4_MEASUREMENT_ID || '').trim()

const seoHeadSnippets = () => {
  let snippets = ''
  if (gscVerification) {
    snippets += `    <meta name="google-site-verification" content="${gscVerification}" />\n`
  }
  if (ga4Id) {
    // Classic inline stub + dynamic async tag. Never type=module.
    // If gtag.js is blocked, the stub stays and React still mounts.
    snippets += `    <script data-cfasync="false">
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('consent', 'default', {
        analytics_storage: 'granted',
        ad_storage: 'denied',
        ad_user_data: 'denied',
        ad_personalization: 'denied',
        wait_for_update: 0
      });
      gtag('js', new Date());
      gtag('config', '${ga4Id}', {
        send_page_view: false,
        anonymize_ip: true
      });
      (function () {
        var s = document.createElement('script');
        s.async = true;
        s.src = 'https://www.googletagmanager.com/gtag/js?id=${ga4Id}';
        s.onerror = function () {};
        document.head.appendChild(s);
      })();
    </script>
`
  }
  return snippets
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    {
      name: 'americonfort-html-seo',
      transformIndexHtml(html) {
        // Rocket Loader must never rewrite Vite module scripts.
        let out = html
          .replaceAll('<script type="module"', '<script data-cfasync="false" type="module"')
          .replaceAll('<link rel="modulepreload"', '<link data-cfasync="false" rel="modulepreload"')
        const snippets = seoHeadSnippets()
        if (snippets) out = out.replace('</head>', `${snippets}</head>`)
        return out
      },
    },
  ],
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
