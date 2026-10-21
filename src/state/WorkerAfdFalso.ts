// Worker falso para testes: guarda os pedidos e deixa o teste responder.

import type { PedidoLeituraAfd, RelatorioAfd, RespostaWorkerAfd } from '../afd/tipos'
import { parsearAfd } from '../afd/parser'
import type { WorkerAfd } from './AfdContext'

export class WorkerAfdFalso implements WorkerAfd {
  onmessage: ((evento: MessageEvent<RespostaWorkerAfd>) => void) | null = null
  onerror: ((evento: ErrorEvent) => void) | null = null
  pedidos: PedidoLeituraAfd[] = []
  encerrado = false

  postMessage(pedido: PedidoLeituraAfd): void {
    this.pedidos.push(pedido)
  }

  terminate(): void {
    this.encerrado = true
  }

  /** Token do último pedido recebido. */
  get token(): number {
    const ultimo = this.pedidos[this.pedidos.length - 1]
    if (ultimo === undefined) throw new Error('o worker falso não recebeu pedido')
    return ultimo.token
  }

  responder(resposta: RespostaWorkerAfd): void {
    this.onmessage?.(new MessageEvent('message', { data: resposta }))
  }

  progredir(progresso: number, token = this.token): void {
    this.responder({ token, tipo: 'progresso', progresso })
  }

  concluir(relatorio: RelatorioAfd = relatorioVazio(), token = this.token): void {
    this.responder({ token, tipo: 'pronto', relatorio })
  }

  falhar(mensagem: string): void {
    this.onerror?.(new ErrorEvent('error', { message: mensagem }))
  }
}

export function relatorioVazio(): RelatorioAfd {
  return parsearAfd('')
}

/** Fábrica que registra cada worker criado, na ordem. */
export function fabricaDeWorkersFalsos() {
  const criados: WorkerAfdFalso[] = []
  const criarWorker = () => {
    const worker = new WorkerAfdFalso()
    criados.push(worker)
    return worker
  }
  return { criados, criarWorker }
}
