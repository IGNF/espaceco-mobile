import { defineConfig, loadEnv } from 'vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    root: 'src',
    base: './',
    publicDir: 'assets',
    resolve: {
      alias: [
        // Normalisation des imports cordovapp vers la racine du projet
        { find: /^(?:\.\.\/)+src\//, replacement: '/' }
      ]
    },
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
      'process.env': JSON.stringify(env)
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
