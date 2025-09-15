import { defineConfig, loadEnv } from 'vite'

export default defineConfig(({ mode }) => {
  // Load env files (.env, .env.local, .env.development, etc.)
  const env = loadEnv(mode, process.cwd(), '')

  return {
    root: 'src',
    base: './',
    publicDir: 'assets',
    build: {
      outDir: '../www',
      sourcemap: true,
      emptyOutDir: true,
      commonjsOptions: {
        transformMixedEsModules: true
      }
    },
    server: {
      host: true,
      port: 1234
    },
    define: {
      'process.env': Object.fromEntries(
        Object.entries(env).map(([k, v]) => [k, JSON.stringify(v)])
      )
    },
    optimizeDeps: {
      // Pré-bundled modules
      include: [
        'collaboratif-client-api',
        'collab-form',
        'webfontloader',
        'rbush',
        'quickselect',
        'moment'
      ],
      // Évite le pré-bundling de ces modules (cause des problèmes de dépendances)
      exclude: ['cordovapp/report/ReportForm'],
      esbuildOptions: { supported: { 'dynamic-import': true } }
    }
  }
})
