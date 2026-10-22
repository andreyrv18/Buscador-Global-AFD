// Liga filtros e paginação ao `consultar()` do AfdContext: cada mudança vira
// uma consulta ao worker, e a view recebe só a página pronta.

import { useCallback, useEffect, useState } from 'react'
import type { AbaAfd, RegistrosPorAba, ResultadoConsultaAfd } from '../afd/tipos'
import { ConsultaDescartadaErro } from '../state/AfdContext'
import { useAfd } from '../state/useAfd'
import { useFiltrosAfd } from './useFiltrosAfd'
import type { FiltrosAfdHook } from './useFiltrosAfd'
import { usePaginacao } from './usePaginacao'
import type { Paginacao, TamanhoPagina } from './usePaginacao'

export interface ConsultaAfdHook<A extends AbaAfd> {
  /** A página atual, já filtrada e ordenada pelo worker. */
  itens: RegistrosPorAba[A][]
  /** Total de registros que passam nos filtros. */
  total: number
  /** `true` enquanto a consulta da página atual não volta do worker. */
  carregando: boolean
  erro: string | null
  paginacao: Paginacao
  filtros: FiltrosAfdHook
}

const resultadoVazio = <R extends RegistrosPorAba[AbaAfd]>(): ResultadoConsultaAfd<R> => ({ itens: [], total: 0 })

export function useConsultaAfd<A extends AbaAfd>(
  aba: A,
  tamanhoInicial?: TamanhoPagina,
): ConsultaAfdHook<A> {
  const { arquivo, status, consultar } = useAfd()
  const [resultado, setResultado] = useState(resultadoVazio<RegistrosPorAba[A]>)
  const [consultando, setConsultando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const visivel = status === 'pronto' ? resultado : resultadoVazio<RegistrosPorAba[A]>()
  const paginacao = usePaginacao(visivel.total, tamanhoInicial)
  const { irPara, offset, limite } = paginacao
  const voltarParaPrimeira = useCallback(() => irPara(1), [irPara])
  const filtros = useFiltrosAfd({ aoMudar: voltarParaPrimeira })
  const { nome, cpfPis, data } = filtros.aplicados
  const { ordemConsulta } = filtros

  // Arquivo novo: volta à página 1 e esquece o resultado do anterior. Os
  // filtros ficam.
  const [arquivoAtual, setArquivoAtual] = useState(arquivo)
  if (arquivo !== arquivoAtual) {
    setArquivoAtual(arquivo)
    setResultado(resultadoVazio<RegistrosPorAba[A]>())
    setErro(null)
    irPara(1)
  }

  useEffect(() => {
    if (status !== 'pronto') return
    let ativo = true
    setConsultando(true)
    setErro(null)
    consultar({ aba, filtros: { nome, cpfPis, data }, ordem: ordemConsulta, offset, limite }).then(
      (novo) => {
        if (!ativo) return
        setResultado(novo)
        setConsultando(false)
      },
      (motivo: unknown) => {
        if (!ativo) return
        setConsultando(false)
        // Substituída por outra consulta: o resultado que vale chega por ela.
        if (motivo instanceof ConsultaDescartadaErro) return
        setErro(motivo instanceof Error ? motivo.message : String(motivo))
      },
    )
    return () => {
      ativo = false
    }
  }, [aba, status, consultar, nome, cpfPis, data, ordemConsulta, offset, limite])

  return {
    itens: visivel.itens,
    total: visivel.total,
    carregando: status === 'pronto' && consultando,
    erro,
    paginacao,
    filtros,
  }
}
