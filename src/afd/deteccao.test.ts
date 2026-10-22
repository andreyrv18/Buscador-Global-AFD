// @vitest-environment node
import { describe, expect, it } from 'vitest'
import {
  detectarLeiaute,
  detectarPortaria,
  ehLinhaDeRegistro,
  ehTrailer,
  indicaPortaria595,
  serveParaDeteccao,
} from './deteccao'

const CABECALHO = '000000000' + '1' + '1' + '12345678000195'
const MARCACAO_671 = '000000005' + '3' + '2026-01-05T08:00:00-0300' + '12345678901 ' + 'ABCD'
const MARCACAO_LEGADO = '000000005' + '3' + '05012026' + '0800' + '012345678901'
const TRAILER = '999999999' + '000000001' + '000000003' + '9'

describe('ehLinhaDeRegistro', () => {
  it('deve aceitar linha cujas 9 primeiras posições são numéricas', () => {
    expect(ehLinhaDeRegistro(MARCACAO_LEGADO)).toBe(true)
  })

  it('deve recusar a linha de assinatura digital', () => {
    expect(ehLinhaDeRegistro('MEUCIQDf4kZ8ASSINATURA+/b2xh=')).toBe(false)
  })

  it('deve recusar linha com menos de 9 dígitos no início', () => {
    expect(ehLinhaDeRegistro('12345678X3')).toBe(false)
  })
})

describe('ehTrailer', () => {
  it('deve reconhecer o trailer pelo NSR 999999999', () => {
    expect(ehTrailer(TRAILER)).toBe(true)
  })

  it('não deve tratar registro comum como trailer', () => {
    expect(ehTrailer(MARCACAO_671)).toBe(false)
  })
})

describe('serveParaDeteccao', () => {
  it('deve aceitar registros dos tipos 3 a 7', () => {
    expect(serveParaDeteccao(MARCACAO_671)).toBe(true)
  })

  it('deve recusar o cabeçalho', () => {
    expect(serveParaDeteccao(CABECALHO)).toBe(false)
  })

  it('deve recusar o trailer', () => {
    expect(serveParaDeteccao(TRAILER)).toBe(false)
  })
})

describe('detectarLeiaute', () => {
  it('deve identificar a 671 pelo T no índice 20', () => {
    expect(detectarLeiaute(MARCACAO_671)).toBe('671')
  })

  it('deve identificar o legado quando não há T no índice 20', () => {
    expect(detectarLeiaute(MARCACAO_LEGADO)).toBe('legado')
  })
})

describe('indicaPortaria595', () => {
  it('deve indicar 595 para qualquer registro Tipo 6', () => {
    expect(indicaPortaria595('000000009' + '6' + '05012026' + '1000' + '07')).toBe(true)
  })

  it('deve indicar 595 para Tipo 4 com CPF do responsável', () => {
    expect(indicaPortaria595('0000000084' + '0501202609000501202609059998887776')).toBe(false)
    expect(indicaPortaria595('0000000084' + '05012026090005012026090599988877766')).toBe(true)
  })

  it('deve indicar 595 para Tipo 5 com CPF do responsável', () => {
    const tipo5Curto = '0000000025' + '0201202608001'.padEnd(77, ' ')
    expect(indicaPortaria595(tipo5Curto)).toBe(false)
    expect(indicaPortaria595(tipo5Curto.padEnd(102, '9'))).toBe(true)
  })

  it('não deve indicar 595 para marcação', () => {
    expect(indicaPortaria595(MARCACAO_LEGADO + 'ABCD')).toBe(false)
  })
})

describe('detectarPortaria', () => {
  it('deve detectar a 671 ignorando o cabeçalho', () => {
    expect(detectarPortaria([CABECALHO, MARCACAO_671, TRAILER])).toBe('671')
  })

  it('deve detectar a 1510 quando não há campo exclusivo da 595', () => {
    expect(detectarPortaria([CABECALHO, MARCACAO_LEGADO, TRAILER])).toBe('1510')
  })

  it('deve detectar a 595 quando aparece um Tipo 6', () => {
    const evento = '000000009' + '6' + '05012026' + '1000' + '07'
    expect(detectarPortaria([CABECALHO, MARCACAO_LEGADO, evento])).toBe('595')
  })

  it('deve retornar null quando não há registro dos tipos 3 a 7', () => {
    expect(detectarPortaria([CABECALHO, TRAILER, 'ASSINATURA'])).toBeNull()
  })
})
