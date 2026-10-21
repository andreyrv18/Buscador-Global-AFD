import type { Leiaute, Portaria } from './tipos'

const NOVE_DIGITOS = /^\d{9}/

/** NSR reservado ao trailer, em todas as portarias. */
export const NSR_TRAILER = '999999999'

/** Tipos que carregam data/hora na posição que distingue os leiautes. */
const TIPOS_DE_REGISTRO = new Set(['3', '4', '5', '6', '7'])

/**
 * Uma linha só é registro se as 9 primeiras posições forem numéricas (NSR).
 * Isso descarta a linha de assinatura digital do fim do arquivo.
 */
export function ehLinhaDeRegistro(linha: string): boolean {
  return NOVE_DIGITOS.test(linha)
}

/** O trailer é identificado pelo NSR `999999999`, não pela posição 010. */
export function ehTrailer(linha: string): boolean {
  return linha.startsWith(NSR_TRAILER)
}

/**
 * Indica se a linha serve para detectar o leiaute: registro dos tipos 3 a 7,
 * fora do cabeçalho e do trailer.
 */
export function serveParaDeteccao(linha: string): boolean {
  return (
    ehLinhaDeRegistro(linha) &&
    !ehTrailer(linha) &&
    TIPOS_DE_REGISTRO.has(linha.charAt(9))
  )
}

/**
 * Leiaute de uma linha de registro (tipos 3 a 7). Na 671 a data/hora é ISO
 * e o `T` fica no índice 20; no legado a data é `ddmmaaaa`.
 */
export function detectarLeiaute(linhaRegistro: string): Leiaute {
  return linhaRegistro.charAt(20) === 'T' ? '671' : 'legado'
}

/**
 * Num arquivo legado, indica se a linha traz campo exclusivo da 595:
 * registro Tipo 6, ou Tipo 4/5 comprido o bastante para ter o CPF do responsável.
 */
export function indicaPortaria595(linha: string): boolean {
  switch (linha.charAt(9)) {
    case '6':
      return true
    case '4':
      return linha.length >= 45
    case '5':
      return linha.length >= 102
    default:
      return false
  }
}

/**
 * Detecta a portaria de um conjunto de linhas. Retorna `null` se nenhuma linha
 * for registro dos tipos 3 a 7.
 */
export function detectarPortaria(linhas: Iterable<string>): Portaria | null {
  let leiaute: Leiaute | null = null
  for (const linha of linhas) {
    if (!serveParaDeteccao(linha)) continue
    if (leiaute === null) {
      leiaute = detectarLeiaute(linha)
      if (leiaute === '671') return '671'
    }
    if (indicaPortaria595(linha)) return '595'
  }
  return leiaute === null ? null : '1510'
}
