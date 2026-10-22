// Paginação de uma consulta ao worker: a página vira offset e limite, e o
// total devolvido pelo worker vira o total de páginas.

import { useCallback, useState } from 'react'

export const TAMANHOS_PAGINA = [10, 20, 50, 100, 500] as const

export type TamanhoPagina = (typeof TAMANHOS_PAGINA)[number]

export interface Paginacao {
  /** Página atual, a partir de 1. */
  pagina: number
  tamanho: TamanhoPagina
  /** Índice do primeiro item da página, para a `ConsultaAfd`. */
  offset: number
  /** Itens por página, para a `ConsultaAfd`. */
  limite: number
  /** Pelo menos 1, mesmo sem itens. */
  totalPaginas: number
  /** Vai para a página pedida, limitada ao intervalo existente. */
  irPara(pagina: number): void
  /** Troca o tamanho da página e volta para a primeira. */
  mudarTamanho(tamanho: TamanhoPagina): void
}

export function calcularTotalPaginas(total: number, tamanho: number): number {
  return Math.max(1, Math.ceil(total / tamanho))
}

/** `total` é o total de itens filtrados que o worker devolveu. */
export function usePaginacao(total: number, tamanhoInicial: TamanhoPagina = TAMANHOS_PAGINA[0]): Paginacao {
  const [pagina, setPagina] = useState(1)
  const [tamanho, setTamanho] = useState<TamanhoPagina>(tamanhoInicial)
  const totalPaginas = calcularTotalPaginas(total, tamanho)

  const irPara = useCallback(
    (destino: number) => setPagina(Math.min(Math.max(1, Math.trunc(destino)), totalPaginas)),
    [totalPaginas],
  )

  const mudarTamanho = useCallback((novo: TamanhoPagina) => {
    setTamanho(novo)
    setPagina(1)
  }, [])

  return {
    pagina,
    tamanho,
    offset: (pagina - 1) * tamanho,
    limite: tamanho,
    totalPaginas,
    irPara,
    mudarTamanho,
  }
}
