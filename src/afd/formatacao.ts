// Formatação de data e hora do AFD para exibição. As views usam estas funções
// em vez de remontar a string cada uma do seu jeito.

import type { DataHoraAfd } from './tipos'

/** `AAAA-MM-DD` → `DD/MM/AAAA`. Texto fora do formato volta como veio. */
export function formatarData(data: string): string {
  const partes = /^(\d{4})-(\d{2})-(\d{2})$/.exec(data)
  if (partes === null) return data
  const [, ano, mes, dia] = partes
  return `${dia}/${mes}/${ano}`
}

/**
 * `hh:mm:ss` → `hh:mm`. Nos registros os segundos são sempre `00` (o legado
 * nem os tem). A gravação do Tipo 7 tem segundos de verdade: use `hora` direto.
 */
export function formatarHora(dataHora: DataHoraAfd): string {
  return dataHora.hora.slice(0, 5)
}

/** `DD/MM/AAAA hh:mm`. */
export function formatarDataHora(dataHora: DataHoraAfd): string {
  return `${formatarData(dataHora.data)} ${formatarHora(dataHora)}`
}
