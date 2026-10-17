import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import paket from './package.json' with { type: 'json' };

// @imgly/background-removal, ONNX runtime dosyalarını (wasm/mjs) kendi CDN'inden (publicPath) yükler.
// Vite'ın paketlediği ~24 MB'lık kopyalar hiç kullanılmaz; yayına çıkmasınlar.
function kullanilmayanOrtDosyalariniAt(): Plugin {
  return {
    name: 'kullanilmayan-ort-dosyalarini-at',
    apply: 'build',
    generateBundle(_, bundle) {
      for (const [ad, oge] of Object.entries(bundle)) {
        if (oge.type === 'asset' && /ort[.-].*\.(wasm|mjs)$/.test(ad)) delete bundle[ad];
      }
    },
  };
}

export default defineConfig({
  define: { __SURUM__: JSON.stringify(paket.version) },
  plugins: [
    react(),
    kullanilmayanOrtDosyalariniAt(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Gardırop',
        short_name: 'Gardırop',
        description: 'Kişisel, yapay zekâ destekli kombin uygulaması',
        lang: 'tr',
        start_url: '/',
        display: 'standalone',
        background_color: '#F1F3F0',
        theme_color: '#2F3E6B',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          { src: 'icon.svg', sizes: 'any', type: 'image/svg+xml' },
        ],
      },
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
      },
    }),
  ],
  worker: { format: 'es' },
});
