import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { createRequire } from 'node:module'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

// #44: Inter is served from our own domain; no page may ask fonts.googleapis.com or
// fonts.gstatic.com for anything, since Google would receive each visitor's IP address.
// #51: the woff2 files are committed to the repo and loaded with next/font/local, so the build
// never downloads anything from Google either (next/font/google failed twice on Vercel).
const require = createRequire(import.meta.url)
const ROOT = join(__dirname, '..')
const FONT_HOSTS = /fonts\.(googleapis|gstatic)\.com/

function sourceFiles(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) return sourceFiles(path)
    return /\.(js|jsx|css)$/.test(name) && !name.endsWith('.test.js') ? [path] : []
  })
}

const appSources = () => ['app', 'components'].flatMap((dir) => sourceFiles(join(ROOT, dir)))

describe('Inter is self-hosted (#44)', () => {
  it('no source file in app/ or components/ references a Google Fonts host', () => {
    const offenders = appSources().filter((path) => FONT_HOSTS.test(readFileSync(path, 'utf8')))
    expect(offenders).toEqual([])
  })

  it('the root layout loads Inter with next/font/local, swap and --font-inter (#51)', () => {
    const layout = readFileSync(join(ROOT, 'app/layout.js'), 'utf8')
    expect(layout).toMatch(/from 'next\/font\/local'/)
    expect(layout).toMatch(/variable: '--font-inter'/)
    expect(layout).toMatch(/display: 'swap'/)
    for (const weight of ['400', '500', '600']) {
      expect(layout).toContain(`./fonts/inter-latin-${weight}-normal.woff2`)
      expect(layout).toContain(`weight: '${weight}'`)
    }
  })

  it('no source file imports next/font/google, which downloads fonts at build time (#51)', () => {
    const offenders = appSources().filter((path) =>
      /next\/font\/google/.test(readFileSync(path, 'utf8')),
    )
    expect(offenders).toEqual([])
  })

  it('the Inter woff2 files (400, 500, 600) and their SIL OFL 1.1 licence are in the repo (#51)', () => {
    for (const weight of ['400', '500', '600']) {
      const file = join(ROOT, `app/fonts/inter-latin-${weight}-normal.woff2`)
      expect(existsSync(file)).toBe(true)
      expect(readFileSync(file).subarray(0, 4).toString('latin1')).toBe('wOF2')
    }
    expect(readFileSync(join(ROOT, 'app/fonts/LICENSE.txt'), 'utf8')).toMatch(
      /SIL Open Font License, Version 1\.1/,
    )
  })

  it('Tailwind font-sans resolves to Inter and font-display is an exact alias of it', () => {
    const { fontFamily } = require('../tailwind.config.js').theme.extend
    expect(fontFamily.sans[0]).toBe('var(--font-inter)')
    expect(fontFamily.display).toEqual(fontFamily.sans)
  })

  it('no font is declared that is never loaded (#51)', () => {
    const files = [join(ROOT, 'tailwind.config.js'), ...appSources()]
    const offenders = files.filter((path) => /Cal\s*Sans/i.test(readFileSync(path, 'utf8')))
    expect(offenders).toEqual([])
  })

  it('no CSS rule or SVG attribute names the bare "Inter" family, which next/font renames', () => {
    const offenders = appSources().filter((path) =>
      /'Inter'|"Inter,|fontFamily="Inter/.test(readFileSync(path, 'utf8')),
    )
    expect(offenders).toEqual([])
  })
})
