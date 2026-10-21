// Quebra de linhas para leitura em chunks: o texto chega em pedaços de tamanho
// arbitrário, e uma linha pode começar num pedaço e terminar no seguinte.

export interface QuebraDeLinhas {
  /** Linhas completas, sem o terminador. */
  linhas: string[]
  /** Início da linha ainda incompleta; vai na frente do próximo pedaço. */
  resto: string
}

const TERMINADOR = /\r\n|\n|\r/

/**
 * Junta o resto do pedaço anterior ao pedaço novo e separa as linhas completas.
 * Aceita CRLF, LF e CR. Um `\r` no fim do pedaço fica no resto, porque pode ser
 * a primeira metade de um `\r\n` que termina no pedaço seguinte.
 */
export function quebrarLinhas(resto: string, pedaco: string): QuebraDeLinhas {
  const texto = resto + pedaco
  const fim = texto.endsWith('\r') ? texto.length - 1 : texto.length
  const linhas = texto.slice(0, fim).split(TERMINADOR)
  const incompleta = linhas.pop() ?? ''
  return { linhas, resto: incompleta + texto.slice(fim) }
}

/**
 * Linhas que sobraram no fim do arquivo. Uma última linha sem terminador ainda
 * é linha; um `\r` pendurado é removido pelo parser.
 */
export function finalizarLinhas(resto: string): string[] {
  return resto === '' ? [] : [resto]
}
