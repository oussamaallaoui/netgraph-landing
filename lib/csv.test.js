import { describe, expect, it } from 'vitest'
import { parseCsv } from './csv.js'

describe('parseCsv', () => {
  it('parses simple rows', () => {
    expect(parseCsv('a,b,c\n1,2,3')).toEqual([['a', 'b', 'c'], ['1', '2', '3']])
  })

  it('returns [] for empty input, a lone BOM or a non-string', () => {
    expect(parseCsv('')).toEqual([])
    expect(parseCsv('\uFEFF')).toEqual([])
    expect(parseCsv(undefined)).toEqual([])
    expect(parseCsv(null)).toEqual([])
    expect(parseCsv(42)).toEqual([])
  })

  it('ignores a single trailing line break', () => {
    expect(parseCsv('a,b\n')).toEqual([['a', 'b']])
    expect(parseCsv('a,b\r\n')).toEqual([['a', 'b']])
  })

  it('keeps empty lines in the middle as one empty field', () => {
    expect(parseCsv('a\n\nb')).toEqual([['a'], [''], ['b']])
  })

  it('handles CRLF, LF and lone CR line endings', () => {
    expect(parseCsv('a,b\r\nc,d\ne,f\rg,h')).toEqual([['a', 'b'], ['c', 'd'], ['e', 'f'], ['g', 'h']])
  })

  it('strips a leading BOM', () => {
    expect(parseCsv('\uFEFFFirst Name,Last Name\nA,B')).toEqual([['First Name', 'Last Name'], ['A', 'B']])
  })

  it('keeps empty fields, including trailing ones', () => {
    expect(parseCsv(',a,,b,')).toEqual([['', 'a', '', 'b', '']])
  })

  it('parses quoted fields with commas, escaped quotes and newlines', () => {
    const text = 'name,note\n"Atlas, Conseil","He said ""hi""\nsecond line"\r\nx,"y"'
    expect(parseCsv(text)).toEqual([
      ['name', 'note'],
      ['Atlas, Conseil', 'He said "hi"\nsecond line'],
      ['x', 'y'],
    ])
  })

  it('parses an empty quoted field and a field that is only an escaped quote', () => {
    expect(parseCsv('"",""""')).toEqual([['', '"']])
  })

  it('keeps CRLF inside quotes as is', () => {
    expect(parseCsv('"a\r\nb",c')).toEqual([['a\r\nb', 'c']])
  })

  it('keeps accents and other Unicode', () => {
    expect(parseCsv('Leïla,Échantillon,Démoventures – VC')).toEqual([['Leïla', 'Échantillon', 'Démoventures – VC']])
  })

  it('is lenient with malformed quotes and never throws', () => {
    expect(parseCsv('a"b,c')).toEqual([['a"b', 'c']])
    expect(parseCsv('"ab"cd,e')).toEqual([['abcd', 'e']])
    expect(parseCsv('"unterminated,field\nnext')).toEqual([['unterminated,field\nnext']])
  })

  it('handles a large input quickly', () => {
    const line = 'Prénom,Nom,https://www.linkedin.com/in/x,,"Société, SA",Poste,27 Oct 2026\n'
    const rows = parseCsv(line.repeat(50000))
    expect(rows).toHaveLength(50000)
    expect(rows[49999][4]).toBe('Société, SA')
  })
})
