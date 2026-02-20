import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { execSync } from 'node:child_process'

const getGitVersion = () => {
  try {
    return execSync('git rev-parse --short HEAD', {
      stdio: ['ignore', 'pipe', 'ignore'],
    })
      .toString()
      .trim()
  } catch {
    return 'unknown'
  }
}

const envVersion =
  process.env.VITE_APP_VERSION ||
  process.env.RAILWAY_GIT_COMMIT_SHA ||
  process.env.RAILWAY_GIT_COMMIT ||
  process.env.GITHUB_SHA ||
  process.env.COMMIT_SHA

const appVersion = envVersion || getGitVersion()

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify(appVersion),
  },
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
