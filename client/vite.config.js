import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'eruda-inject',
      transformIndexHtml(html, ctx) {
        // Only inject in development mode
        if (ctx.server) {
          return html.replace(
            '</body>',
            `
    <!-- Eruda Dev Tools -->
    <script src="https://cdn.jsdelivr.net/npm/eruda"></script>
    <script>
      window.addEventListener('load', function() {
        if (typeof eruda !== 'undefined') {
          eruda.init({
            defaults: {
              displaySize: 40,
              theme: 'Material Palenight'
            }
          });
          console.log('🔧 Eruda dev tools initialized');
        }
      });
    </script>
    </body>`
          );
        }
        return html;
      }
    }
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@components': path.resolve(__dirname, './src/components'),
      '@pages': path.resolve(__dirname, './src/pages'),
      '@store': path.resolve(__dirname, './src/store'),
      '@lib': path.resolve(__dirname, './src/lib'),
      '@assets': path.resolve(__dirname, './src/assets'),
    },
  },
  server: {
    port: 5173,
    host: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true
      }
    }
  }
})
