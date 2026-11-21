import { defineConfig } from 'vitest/config'

// Unit tests for the pure logic in lib/ and the UI logic in components/ (Sprint 1), and the API routes in
// app/api/ (#10). No jsdom: lib/ has no DOM, and lib/store.js is tested with fake-indexeddb.
// Components are .js files with JSX (Next.js convention): esbuild reads only components/ as JSX with the
// automatic runtime, so component tests (#11 SubscribeForm, #35 introducers) render them to static HTML
// with react-dom/server; lib/ and app/ stay plain JS.
export default defineConfig({
  esbuild: {
    loader: 'jsx',
    include: /components\/.*\.js$/,
    exclude: [],
    jsx: 'automatic',
  },
  test: {
    environment: 'node',
    include: ['lib/**/*.test.js', 'components/**/*.test.js', 'app/**/*.test.js'],
  },
})
