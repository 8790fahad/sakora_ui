import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import fs from 'fs'

const pkgVersion =
  JSON.parse(fs.readFileSync(path.resolve(__dirname, 'package.json'), 'utf8')).version ||
  '0.0.0'

function appVersionPlugin() {
  let appVersion = ''

  const resolveVersion = (command) => {
    if (command === 'build') {
      if (!appVersion || appVersion.endsWith('+dev')) {
        appVersion = `${pkgVersion}+${Date.now().toString(36)}`
      }
      return appVersion
    }
    if (!appVersion) appVersion = `${pkgVersion}+dev`
    return appVersion
  }

  const versionPayload = () =>
    JSON.stringify({ version: appVersion || `${pkgVersion}+dev`, forceUpdate: true })

  return {
    name: 'app-version',
    config(_config, { command }) {
      return {
        define: {
          'import.meta.env.VITE_APP_VERSION': JSON.stringify(resolveVersion(command)),
        },
      }
    },
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: 'version.json',
        source: `${versionPayload()}\n`,
      })
    },
    transformIndexHtml(html) {
      const version = appVersion || `${pkgVersion}+dev`
      if (html.includes('name="app-version"')) return html
      return html.replace(
        '</head>',
        `    <meta name="app-version" content="${version}" />\n  </head>`,
      )
    },
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const pathOnly = String(req.url || '').split('?')[0]
        if (!pathOnly.endsWith('/version.json')) {
          next()
          return
        }
        res.statusCode = 200
        res.setHeader('Content-Type', 'application/json; charset=utf-8')
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate')
        res.end(versionPayload())
      })
    },
  }
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    appVersionPlugin(),
    react(),
    {
      name: 'github-pages-spa-fallback',
      closeBundle() {
        const indexPath = path.resolve(__dirname, 'dist/index.html')
        const fallbackPath = path.resolve(__dirname, 'dist/404.html')
        if (fs.existsSync(indexPath)) {
          fs.copyFileSync(indexPath, fallbackPath)
        }
      },
    },
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
    dedupe: ['react', 'react-dom'],
  },
  server: {
    port: 5173,
    watch: {
      ignored: ['**/.chrome-profile/**', '**/.chrome-profile-check/**'],
    },
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
})

