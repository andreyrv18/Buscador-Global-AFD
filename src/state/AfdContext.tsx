// Estado do arquivo AFD compartilhado pelas abas: um upload alimenta as quatro views.
// Os registros ficam no worker; a interface guarda o resumo e pede cada página com `consultar`.

import { createContext, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import type {
  AbaAfd,
  ConsultaAfd,
  PedidoLeituraAfd,
  RegistrosPorAba,
  RespostaWorkerAfd,
  ResultadoConsultaAfd,
  ResumoAfd,
} from '../afd/tipos'

export type StatusAfd = 'ocioso' | 'lendo' | 'pronto' | 'erro'

export interface EstadoAfd {
  arquivo: File | null
  resumo: ResumoAfd | null
  status: StatusAfd
  /** Percentual de 0 a 100 dos bytes lidos. */
  progresso: number
  erro: string | null
}

export type ConsultarAfd = <A extends AbaAfd>(
  consulta: ConsultaAfd<A>,
) => Promise<ResultadoConsultaAfd<RegistrosPorAba[A]>>

export interface ValorAfdContext extends EstadoAfd {
  /** Começa a ler o arquivo, encerrando qualquer leitura em andamento. */
  carregarArquivo(arquivo: File): void
  /**
   * Pede ao worker uma página filtrada e ordenada. Só a consulta mais recente
   * é atendida: a anterior, se ainda pendente, é rejeitada com
   * `ConsultaDescartadaErro`, e a resposta dela é ignorada quando chegar.
   */
  consultar: ConsultarAfd
}

/** Consulta substituída por outra mais recente, ou cujo arquivo foi trocado. */
export class ConsultaDescartadaErro extends Error {
  constructor(motivo: string) {
    super(motivo)
    this.name = 'ConsultaDescartadaErro'
  }
}

/** O que o contexto usa de um `Worker`; nos testes entra um falso. */
export interface WorkerAfd {
  onmessage: ((evento: MessageEvent<RespostaWorkerAfd>) => void) | null
  onerror: ((evento: ErrorEvent) => void) | null
  postMessage(pedido: PedidoLeituraAfd): void
  terminate(): void
}

export function criarWorkerAfd(): WorkerAfd {
  return new Worker(new URL('../afd/afd.worker.ts', import.meta.url), { type: 'module' })
}

export interface AfdProviderProps {
  children: ReactNode
  criarWorker?: () => WorkerAfd
}

interface ConsultaPendente {
  idConsulta: number
  resolver(resultado: ResultadoConsultaAfd): void
  rejeitar(erro: Error): void
}

const ESTADO_INICIAL: EstadoAfd = {
  arquivo: null,
  resumo: null,
  status: 'ocioso',
  progresso: 0,
  erro: null,
}

export const AfdContext = createContext<ValorAfdContext | null>(null)

export function AfdProvider({ children, criarWorker = criarWorkerAfd }: AfdProviderProps) {
  const [estado, setEstado] = useState<EstadoAfd>(ESTADO_INICIAL)
  const workerRef = useRef<WorkerAfd | null>(null)
  // Só as mensagens do upload mais recente são aceitas.
  const tokenRef = useRef(0)
  // O worker só responde consultas depois do 'pronto'.
  const prontoRef = useRef(false)
  const idConsultaRef = useRef(0)
  const consultaRef = useRef<ConsultaPendente | null>(null)

  const descartarConsulta = useCallback((motivo: string) => {
    const pendente = consultaRef.current
    consultaRef.current = null
    pendente?.rejeitar(new ConsultaDescartadaErro(motivo))
  }, [])

  const encerrarWorker = useCallback(() => {
    workerRef.current?.terminate()
    workerRef.current = null
    prontoRef.current = false
    descartarConsulta('O processamento do arquivo foi encerrado.')
  }, [descartarConsulta])

  useEffect(
    () => () => {
      tokenRef.current++
      encerrarWorker()
    },
    [encerrarWorker],
  )

  const carregarArquivo = useCallback(
    (arquivo: File) => {
      encerrarWorker()
      const token = ++tokenRef.current
      const ehAtual = () => token === tokenRef.current
      const falhar = (mensagem: string) => {
        encerrarWorker()
        setEstado((anterior) => ({ ...anterior, status: 'erro', erro: mensagem }))
      }

      setEstado({ ...ESTADO_INICIAL, arquivo, status: 'lendo' })

      let worker: WorkerAfd
      try {
        worker = criarWorker()
      } catch (erro: unknown) {
        const detalhe = erro instanceof Error ? erro.message : String(erro)
        falhar(`Não foi possível iniciar o processamento: ${detalhe}`)
        return
      }
      workerRef.current = worker

      worker.onmessage = (evento) => {
        const resposta = evento.data
        if (!ehAtual() || resposta.token !== token) return
        switch (resposta.tipo) {
          case 'progresso':
            setEstado((anterior) => ({ ...anterior, progresso: resposta.progresso }))
            break
          case 'pronto':
            // O worker continua vivo: é ele que guarda os registros.
            prontoRef.current = true
            setEstado((anterior) => ({
              ...anterior,
              resumo: resposta.resumo,
              status: 'pronto',
              progresso: 100,
            }))
            break
          case 'erro':
            falhar(resposta.mensagem)
            break
          case 'resultado': {
            const pendente = consultaRef.current
            // Resposta de consulta já substituída: descarta.
            if (pendente === null || pendente.idConsulta !== resposta.idConsulta) return
            consultaRef.current = null
            const { itens, total, contagemOperacoes } = resposta
            pendente.resolver(contagemOperacoes ? { itens, total, contagemOperacoes } : { itens, total })
            break
          }
        }
      }

      worker.onerror = (evento) => {
        if (!ehAtual()) return
        falhar(`Falha no processamento do arquivo: ${evento.message || 'erro desconhecido'}`)
      }

      worker.postMessage({ tipo: 'ler', token, arquivo })
    },
    [criarWorker, encerrarWorker],
  )

  const consultar = useCallback<ConsultarAfd>(
    <A extends AbaAfd>(consulta: ConsultaAfd<A>) => {
      const worker = workerRef.current
      if (worker === null || !prontoRef.current) {
        return Promise.reject(new Error('Nenhum arquivo AFD pronto para consulta.'))
      }
      descartarConsulta('Substituída por uma consulta mais recente.')
      const idConsulta = ++idConsultaRef.current
      return new Promise<ResultadoConsultaAfd<RegistrosPorAba[A]>>((resolver, rejeitar) => {
        consultaRef.current = {
          idConsulta,
          // O worker responde com registros da aba pedida.
          resolver: (resultado) => resolver(resultado as ResultadoConsultaAfd<RegistrosPorAba[A]>),
          rejeitar,
        }
        worker.postMessage({ ...consulta, tipo: 'consultar', token: tokenRef.current, idConsulta })
      })
    },
    [descartarConsulta],
  )

  const valor = useMemo<ValorAfdContext>(
    () => ({ ...estado, carregarArquivo, consultar }),
    [estado, carregarArquivo, consultar],
  )

  return <AfdContext.Provider value={valor}>{children}</AfdContext.Provider>
}
