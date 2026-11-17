import { defineConfig } from 'vitest/config'

// Unit tests for the pure logic in lib/ and the UI logic in components/ (Sprint 1), and the API routes in
// app/api/ (#10). No jsdom: lib/ has no DOM, and lib/store.js is tested with fake-indexeddb.
// Components are .js files with JSX (Next.js convention): esbuild reads them as JSX so the
// form can be rendered with react-dom/server in tests (#11).
export default defineConfig({
  esbuild: { loader: 'jsx', include: /\.jsx?$/, exclude: [], jsx: 'automatic' },
  test: {
    environment: 'node',
    include: ['lib/**/*.test.js', 'components/**/*.test.js', 'app/**/*.test.js'],
  },
})
