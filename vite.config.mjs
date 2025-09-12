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
      sourcemap: false,
      emptyOutDir: true
    },
    server: {
      host: true,
      port: 1234
    },
    define: {
      'process.env': Object.fromEntries(
        Object.entries(env).map(([k, v]) => [k, JSON.stringify(v)])
      )
    }
  }
})
