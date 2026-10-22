// Filtros de uma aba do AFD. Os campos de texto atualizam na hora (para o
// input) e só chegam à consulta depois de ~200 ms sem digitação.

import { useCallback, useEffect, useRef, useState } from 'react'
import type { OperacaoEmpregado, OrdemAfd } from '../afd/tipos'

export const ATRASO_FILTROS_MS = 200

export type DirecaoOrdem = 'asc' | 'desc'

export interface CamposFiltroAfd {
  nome: string
  /** Só dígitos. */
  cpfPis: string
  /** `AAAA-MM-DD`, ou vazio. */
  data: string
}

export interface FiltrosAfdHook {
  /** O que o usuário digitou; alimenta os inputs. */
  campos: CamposFiltroAfd
  /** Os campos já passados pelo debounce; alimentam a consulta. */
  aplicados: CamposFiltroAfd
  /** Ordem por data e hora. */
  ordem: DirecaoOrdem
  /** `ordem` no formato da `ConsultaAfd`. */
  ordemConsulta: OrdemAfd
  /** Operação do Tipo 5 (cards da aba de empregados); `null` é todas. */
  operacao: OperacaoEmpregado | null
  /** Código do evento do Tipo 6; vazio é todos. */
  codigoEvento: string
  mudarNome(nome: string): void
  /** Descarta tudo que não for dígito. */
  mudarCpfPis(cpfPis: string): void
  mudarData(data: string): void
  /** Aplica na hora, sem debounce. */
  mudarOrdem(ordem: DirecaoOrdem): void
  /** Aplica na hora, sem debounce. */
  mudarOperacao(operacao: OperacaoEmpregado | null): void
  /** Aplica na hora, sem debounce. */
  mudarCodigoEvento(codigo: string): void
  /** Esvazia os campos, a operação e o código, e aplica na hora. */
  limpar(): void
}

export interface OpcoesFiltrosAfd {
  /** Chamado sempre que um filtro ou a ordem chega à consulta. */
  aoMudar?: () => void
  atrasoMs?: number
}

const CAMPOS_VAZIOS: CamposFiltroAfd = { nome: '', cpfPis: '', data: '' }

const ORDEM_CONSULTA: Record<DirecaoOrdem, OrdemAfd> = {
  asc: 'data-crescente',
  desc: 'data-decrescente',
}

const mesmosCampos = (a: CamposFiltroAfd, b: CamposFiltroAfd) =>
  a.nome === b.nome && a.cpfPis === b.cpfPis && a.data === b.data

export function useFiltrosAfd({ aoMudar, atrasoMs = ATRASO_FILTROS_MS }: OpcoesFiltrosAfd = {}): FiltrosAfdHook {
  const [campos, setCampos] = useState<CamposFiltroAfd>(CAMPOS_VAZIOS)
  const [aplicados, setAplicados] = useState<CamposFiltroAfd>(CAMPOS_VAZIOS)
  const [ordem, setOrdem] = useState<DirecaoOrdem>('asc')
  const [operacao, setOperacao] = useState<OperacaoEmpregado | null>(null)
  const [codigoEvento, setCodigoEvento] = useState('')

  // O callback pode mudar a cada render; o debounce usa sempre o mais recente.
  const aoMudarRef = useRef(aoMudar)
  useEffect(() => {
    aoMudarRef.current = aoMudar
  }, [aoMudar])

  useEffect(() => {
    if (mesmosCampos(campos, aplicados)) return
    const temporizador = setTimeout(() => {
      setAplicados(campos)
      aoMudarRef.current?.()
    }, atrasoMs)
    return () => clearTimeout(temporizador)
  }, [campos, aplicados, atrasoMs])

  const mudarNome = useCallback((nome: string) => setCampos((anterior) => ({ ...anterior, nome })), [])

  const mudarCpfPis = useCallback(
    (cpfPis: string) => setCampos((anterior) => ({ ...anterior, cpfPis: cpfPis.replace(/\D/g, '') })),
    [],
  )

  const mudarData = useCallback((data: string) => setCampos((anterior) => ({ ...anterior, data })), [])

  const mudarOrdem = useCallback((nova: DirecaoOrdem) => {
    setOrdem(nova)
    aoMudarRef.current?.()
  }, [])

  const mudarOperacao = useCallback((nova: OperacaoEmpregado | null) => {
    setOperacao(nova)
    aoMudarRef.current?.()
  }, [])

  const mudarCodigoEvento = useCallback((codigo: string) => {
    setCodigoEvento(codigo)
    aoMudarRef.current?.()
  }, [])

  const limpar = useCallback(() => {
    setCampos(CAMPOS_VAZIOS)
    setAplicados(CAMPOS_VAZIOS)
    setOperacao(null)
    setCodigoEvento('')
    aoMudarRef.current?.()
  }, [])

  return {
    campos,
    aplicados,
    ordem,
    ordemConsulta: ORDEM_CONSULTA[ordem],
    operacao,
    codigoEvento,
    mudarNome,
    mudarCpfPis,
    mudarData,
    mudarOrdem,
    mudarOperacao,
    mudarCodigoEvento,
    limpar,
  }
}
