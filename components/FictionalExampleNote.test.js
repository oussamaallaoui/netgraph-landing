// FictionalExampleNote (#34): the line under each example of the landing page. Rendered to static HTML.
import { describe, expect, it } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import FictionalExampleNote from './FictionalExampleNote'

describe('FictionalExampleNote', () => {
  it('says the example is fictional, in slate (readable), not gray-400', () => {
    expect(renderToStaticMarkup(createElement(FictionalExampleNote))).toBe(
      '<p class="text-center text-xs text-slate mt-3">Exemple fictif — noms et entreprises inventés</p>',
    )
  })
})
