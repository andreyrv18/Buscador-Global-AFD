// Worker falso para testes: guarda os pedidos e deixa o teste responder.

import { criarConsultorAfd, resumirRelatorioAfd } from '../afd/consulta'
import { exportarAfd } from '../afd/exportacao'
import type { PedidoLeituraAfd, RelatorioAfd, RespostaWorkerAfd } from '../afd/tipos'
import { parsearAfd } from '../afd/parser'
import type { WorkerAfd } from './AfdContext'

export type PedidoConsultaAfd = Extract<PedidoLeituraAfd, { tipo: 'consultar' }>
export type PedidoExportacaoWorker = Extract<PedidoLeituraAfd, { tipo: 'exportar' }>

export class WorkerAfdFalso implements WorkerAfd {
  onmessage: ((evento: MessageEvent<RespostaWorkerAfd>) => void) | null = null
  onerror: ((evento: ErrorEvent) => void) | null = null
  pedidos: PedidoLeituraAfd[] = []
  encerrado = false
  /** Relatório entregue em `concluir`, que responde às consultas. */
  relatorio: RelatorioAfd | null = null

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

  /** Pedidos de consulta, na ordem em que chegaram. */
  get consultas(): PedidoConsultaAfd[] {
    return this.pedidos.filter((pedido): pedido is PedidoConsultaAfd => pedido.tipo === 'consultar')
  }

  responder(resposta: RespostaWorkerAfd): void {
    this.onmessage?.(new MessageEvent('message', { data: resposta }))
  }

  progredir(progresso: number, token = this.token): void {
    this.responder({ token, tipo: 'progresso', progresso })
  }

  concluir(relatorio: RelatorioAfd = relatorioVazio(), token = this.token): void {
    this.relatorio = relatorio
    this.responder({ token, tipo: 'pronto', resumo: resumirRelatorioAfd(relatorio) })
  }

  /** Responde a uma consulta com o relatório entregue em `concluir`. */
  responderConsulta(pedido: PedidoConsultaAfd): void {
    if (this.relatorio === null) throw new Error('o worker falso ainda não concluiu a leitura')
    const resultado = criarConsultorAfd(this.relatorio).consultar(pedido)
    this.responder({ ...resultado, token: pedido.token, tipo: 'resultado', idConsulta: pedido.idConsulta })
  }

  /** Pedidos de exportação, na ordem em que chegaram. */
  get exportacoes(): PedidoExportacaoWorker[] {
    return this.pedidos.filter((pedido): pedido is PedidoExportacaoWorker => pedido.tipo === 'exportar')
  }

  /** Responde a uma exportação montando o arquivo de verdade, como o worker. */
  responderExportacao(pedido: PedidoExportacaoWorker, agora = new Date(0)): void {
    if (this.relatorio === null) throw new Error('o worker falso ainda não concluiu a leitura')
    const exportado = exportarAfd(this.relatorio, criarConsultorAfd(this.relatorio), pedido, agora)
    this.responder({ ...exportado, token: pedido.token, tipo: 'exportado', idExportacao: pedido.idExportacao })
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
