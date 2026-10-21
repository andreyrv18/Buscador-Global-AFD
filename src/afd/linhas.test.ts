// @vitest-environment node
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { finalizarLinhas, quebrarLinhas } from './linhas'
import { decodificarAfd, dividirLinhas } from './parser'

/** Simula a leitura em chunks: alimenta `quebrarLinhas` pedaço a pedaço. */
function lerEmPedacos(pedacos: string[]): string[] {
  const linhas: string[] = []
  let resto = ''
  for (const pedaco of pedacos) {
    const quebra = quebrarLinhas(resto, pedaco)
    linhas.push(...quebra.linhas)
    resto = quebra.resto
  }
  linhas.push(...finalizarLinhas(resto))
  return linhas
}

function fatiar(texto: string, tamanho: number): string[] {
  const pedacos: string[] = []
  for (let i = 0; i < texto.length; i += tamanho) pedacos.push(texto.slice(i, i + tamanho))
  return pedacos
}

/** Remove o `\r` que o parser descartaria, para comparar com `dividirLinhas`. */
const semCr = (linhas: string[]) => linhas.map((l) => (l.endsWith('\r') ? l.slice(0, -1) : l))

describe('quebrarLinhas', () => {
  it('deve devolver as linhas completas e guardar a incompleta no resto', () => {
    expect(quebrarLinhas('', 'abc\ndef\ngh')).toEqual({ linhas: ['abc', 'def'], resto: 'gh' })
  })

  it('deve completar a linha que começou no pedaço anterior', () => {
    expect(quebrarLinhas('gh', 'ij\nkl')).toEqual({ linhas: ['ghij'], resto: 'kl' })
  })

  it('deve não devolver linha quando o pedaço não tem terminador', () => {
    expect(quebrarLinhas('ab', 'cd')).toEqual({ linhas: [], resto: 'abcd' })
  })

  it('deve aceitar CRLF, LF e CR como terminador', () => {
    expect(quebrarLinhas('', 'a\r\nb\nc\rd')).toEqual({ linhas: ['a', 'b', 'c'], resto: 'd' })
  })

  it('deve guardar o \\r final no resto, porque pode ser metade de um CRLF', () => {
    const primeiro = quebrarLinhas('', 'abc\r')
    expect(primeiro).toEqual({ linhas: [], resto: 'abc\r' })

    const segundo = quebrarLinhas(primeiro.resto, '\ndef\n')
    expect(segundo).toEqual({ linhas: ['abc', 'def'], resto: '' })
  })

  it('deve tratar o \\r do resto como terminador quando o pedaço seguinte não começa com \\n', () => {
    expect(quebrarLinhas('abc\r', 'def\n')).toEqual({ linhas: ['abc', 'def'], resto: '' })
  })

  it('deve preservar linhas vazias no meio do texto', () => {
    expect(quebrarLinhas('', 'a\n\nb\n')).toEqual({ linhas: ['a', '', 'b'], resto: '' })
  })
})

describe('finalizarLinhas', () => {
  it('deve devolver a última linha sem terminador', () => {
    expect(finalizarLinhas('999999999')).toEqual(['999999999'])
  })

  it('deve não devolver nada quando o arquivo termina com terminador', () => {
    expect(finalizarLinhas('')).toEqual([])
  })
})

describe('leitura em pedaços', () => {
  const fixtures = ['afd-671.txt', 'afd-595.txt', 'afd-1510.txt']

  it.each(fixtures)(
    'deve produzir as mesmas linhas de dividirLinhas em %s, qualquer que seja o tamanho do pedaço',
    (nome) => {
      const texto = decodificarAfd(readFileSync(join(__dirname, '__fixtures__', nome)))
      const esperado = dividirLinhas(texto)

      for (let tamanho = 1; tamanho <= 140; tamanho++) {
        expect(semCr(lerEmPedacos(fatiar(texto, tamanho))), `pedaço de ${tamanho}`).toEqual(esperado)
      }
    },
  )

  it('deve ler a última linha quando o arquivo não termina com quebra de linha', () => {
    expect(lerEmPedacos(['abc\nd', 'ef'])).toEqual(['abc', 'def'])
  })
})
