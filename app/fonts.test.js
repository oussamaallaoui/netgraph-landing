import { readdirSync, readFileSync, statSync } from 'node:fs'
import { createRequire } from 'node:module'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

// #44: Inter is self-hosted with next/font/google (downloaded at build time, served from our
// domain). No page may ask fonts.googleapis.com or fonts.gstatic.com for anything, since
// Google would receive each visitor's IP address.
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

  it('the root layout loads Inter with next/font/google and exposes --font-inter', () => {
    const layout = readFileSync(join(ROOT, 'app/layout.js'), 'utf8')
    expect(layout).toMatch(/from 'next\/font\/google'/)
    expect(layout).toMatch(/variable: '--font-inter'/)
    for (const weight of ['400', '500', '600']) expect(layout).toContain(`'${weight}'`)
  })

  it('Tailwind font-sans and font-display resolve to the self-hosted Inter variable', () => {
    const { fontFamily } = require('../tailwind.config.js').theme.extend
    expect(fontFamily.sans[0]).toBe('var(--font-inter)')
    expect(fontFamily.display).toContain('var(--font-inter)')
  })

  it('no CSS rule or SVG attribute names the bare "Inter" family, which next/font renames', () => {
    const offenders = appSources().filter((path) =>
      /'Inter'|"Inter,|fontFamily="Inter/.test(readFileSync(path, 'utf8')),
    )
    expect(offenders).toEqual([])
  })
})
