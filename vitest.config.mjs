import { defineConfig } from 'vitest/config'

// Unit tests for the pure logic in lib/ (Sprint 1). No jsdom: lib/ has no DOM,
// and lib/store.js is tested with fake-indexeddb.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['lib/**/*.test.js'],
  },
})
