// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { formatarData, formatarDataHora, formatarHora } from './formatacao'

const dataHora = { data: '2026-01-05', hora: '08:03:00', fuso: '-0300' }

describe('formatarData', () => {
  it('deve converter AAAA-MM-DD para DD/MM/AAAA', () => {
    expect(formatarData('2026-01-05')).toBe('05/01/2026')
  })

  it('deve devolver como veio o texto fora do formato', () => {
    expect(formatarData('05/01/2026')).toBe('05/01/2026')
  })
})

describe('formatarHora', () => {
  it('deve omitir os segundos', () => {
    expect(formatarHora(dataHora)).toBe('08:03')
  })
})

describe('formatarDataHora', () => {
  it('deve juntar data e hora', () => {
    expect(formatarDataHora(dataHora)).toBe('05/01/2026 08:03')
  })
})
