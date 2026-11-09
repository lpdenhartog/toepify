import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'node:fs'
import path from 'node:path'
import { createHash } from 'node:crypto'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), {
    name: 'offline-app-shell',
    writeBundle(options, bundle) {
      const assets = Object.keys(bundle).filter(name => name.endsWith('.js') || name.endsWith('.css'));
      const revision = createHash('sha256').update(assets.join(',')).digest('hex').slice(0, 12);
      const shell = ['/', '/manifest.webmanifest', '/favicon.svg', ...assets.map(name => `/${name}`)];
      const worker = fs.readFileSync(path.resolve('public/sw.js'), 'utf8')
        .replace('toepify-app-v2', `toepify-app-${revision}`)
        .replace('const APP_SHELL = ["/", "/manifest.webmanifest", "/favicon.svg"];', `const APP_SHELL = ${JSON.stringify(shell)};`);
      fs.writeFileSync(path.resolve(options.dir ?? 'dist', 'sw.js'), worker);
    },
  }],
  server: {
    proxy: {
      '/api': 'http://localhost:3000',
      '/socket.io': {
        target: 'http://localhost:3000',
        ws: true,
      },
    },
  },
})
