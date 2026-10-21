// Estado do arquivo AFD compartilhado pelas abas: um upload alimenta as quatro views.

import { createContext, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import type { PedidoLeituraAfd, RelatorioAfd, RespostaWorkerAfd } from '../afd/tipos'

export type StatusAfd = 'ocioso' | 'lendo' | 'pronto' | 'erro'

export interface EstadoAfd {
  arquivo: File | null
  relatorio: RelatorioAfd | null
  status: StatusAfd
  /** Percentual de 0 a 100 dos bytes lidos. */
  progresso: number
  erro: string | null
}

export interface ValorAfdContext extends EstadoAfd {
  /** Começa a ler o arquivo, encerrando qualquer leitura em andamento. */
  carregarArquivo(arquivo: File): void
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

const ESTADO_INICIAL: EstadoAfd = {
  arquivo: null,
  relatorio: null,
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

  const encerrarWorker = useCallback(() => {
    workerRef.current?.terminate()
    workerRef.current = null
  }, [])

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
            encerrarWorker()
            setEstado((anterior) => ({
              ...anterior,
              relatorio: resposta.relatorio,
              status: 'pronto',
              progresso: 100,
            }))
            break
          case 'erro':
            falhar(resposta.mensagem)
            break
        }
      }

      worker.onerror = (evento) => {
        if (!ehAtual()) return
        falhar(`Falha no processamento do arquivo: ${evento.message || 'erro desconhecido'}`)
      }

      worker.postMessage({ token, arquivo })
    },
    [criarWorker, encerrarWorker],
  )

  const valor = useMemo<ValorAfdContext>(() => ({ ...estado, carregarArquivo }), [estado, carregarArquivo])

  return <AfdContext.Provider value={valor}>{children}</AfdContext.Provider>
}
