import { act, renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { parsearAfd } from '../afd/parser'
import { AfdContext, AfdProvider } from '../state/AfdContext'
import type { ConsultarAfd, ValorAfdContext } from '../state/AfdContext'
import { useAfd } from '../state/useAfd'
import { fabricaDeWorkersFalsos } from '../state/WorkerAfdFalso'
import type { WorkerAfdFalso } from '../state/WorkerAfdFalso'
import { useConsultaAfd } from './useConsultaAfd'
import { ATRASO_FILTROS_MS } from './useFiltrosAfd'

// 25 marcações do legado, uma por minuto, com PIS de 1 a 25.
const MARCACOES = Array.from({ length: 25 }, (_, i) => {
  const n = i + 1
  return String(n).padStart(9, '0') + '3' + '01012020' + '08' + String(n).padStart(2, '0') + String(n).padStart(12, '0')
})

// Tipo 5 do legado: duas inclusões e uma alteração.
const EMPREGADOS = [
  ['I', 'ANA'],
  ['I', 'BRUNO'],
  ['A', 'ANA SILVA'],
].map(([operacao, nome], i) => {
  const pis = i === 1 ? '000000000002' : '000000000001'
  return String(i + 1).padStart(9, '0') + '5' + '01012020' + '0800' + operacao + pis + nome.padEnd(52, ' ')
})

const arquivo = (nome: string) => new File(['x'], nome)

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

function montar() {
  const fabrica = fabricaDeWorkersFalsos()
  const wrapper = ({ children }: { children: ReactNode }) => (
    <AfdProvider criarWorker={fabrica.criarWorker}>{children}</AfdProvider>
  )
  const hook = renderHook(() => ({ afd: useAfd(), consulta: useConsultaAfd('marcacoes') }), { wrapper })
  return { ...fabrica, ...hook }
}

function ultimaConsulta(worker: WorkerAfdFalso) {
  const consultas = worker.consultas
  return consultas[consultas.length - 1]
}

async function responder(worker: WorkerAfdFalso) {
  await act(async () => worker.responderConsulta(ultimaConsulta(worker)))
}

/** Carrega o arquivo, conclui a leitura e responde à primeira consulta. */
async function montarPronto() {
  const montado = montar()
  act(() => montado.result.current.afd.carregarArquivo(arquivo('a.txt')))
  const worker = montado.criados[0]
  act(() => worker.concluir(parsearAfd(MARCACOES)))
  await responder(worker)
  return { ...montado, worker }
}

describe('useConsultaAfd', () => {
  it('deve ficar vazio e sem consultar antes de haver arquivo', () => {
    const { result, criados } = montar()

    expect(result.current.consulta).toMatchObject({ itens: [], total: 0, carregando: false, erro: null })
    expect(result.current.consulta.paginacao).toMatchObject({ pagina: 1, totalPaginas: 1 })
    expect(criados).toHaveLength(0)
  })

  it('não deve consultar enquanto o arquivo está sendo lido', () => {
    const { result, criados } = montar()

    act(() => result.current.afd.carregarArquivo(arquivo('a.txt')))

    expect(criados[0].consultas).toHaveLength(0)
    expect(result.current.consulta.carregando).toBe(false)
  })

  it('deve pedir a primeira página ao concluir a leitura e indicar o carregamento', async () => {
    const { result, criados } = montar()
    act(() => result.current.afd.carregarArquivo(arquivo('a.txt')))
    const worker = criados[0]

    act(() => worker.concluir(parsearAfd(MARCACOES)))

    expect(ultimaConsulta(worker)).toMatchObject({
      aba: 'marcacoes',
      filtros: { nome: '', cpfPis: '', data: '' },
      ordem: 'data-crescente',
      offset: 0,
      limite: 10,
    })
    expect(result.current.consulta.carregando).toBe(true)

    await responder(worker)

    expect(result.current.consulta).toMatchObject({ total: 25, carregando: false, erro: null })
    expect(result.current.consulta.itens.map((m) => m.nsr)).toEqual(MARCACOES.slice(0, 10).map((l) => l.slice(0, 9)))
    expect(result.current.consulta.paginacao.totalPaginas).toBe(3)
  })

  it('deve consultar a página escolhida', async () => {
    const { result, worker } = await montarPronto()

    act(() => result.current.consulta.paginacao.irPara(3))
    expect(ultimaConsulta(worker)).toMatchObject({ offset: 20, limite: 10 })
    await responder(worker)

    expect(result.current.consulta.itens).toHaveLength(5)
    expect(result.current.consulta.total).toBe(25)
  })

  it('deve consultar de novo ao trocar o tamanho da página', async () => {
    const { result, worker } = await montarPronto()

    act(() => result.current.consulta.paginacao.mudarTamanho(50))
    await responder(worker)

    expect(ultimaConsulta(worker)).toMatchObject({ offset: 0, limite: 50 })
    expect(result.current.consulta.itens).toHaveLength(25)
  })

  it('deve aplicar o filtro depois do debounce, voltando para a página 1 numa consulta só', async () => {
    const { result, worker } = await montarPronto()
    act(() => result.current.consulta.paginacao.irPara(2))
    await responder(worker)
    const antes = worker.consultas.length

    act(() => result.current.consulta.filtros.mudarCpfPis('000.000.000-25'))
    expect(worker.consultas).toHaveLength(antes)
    act(() => vi.advanceTimersByTime(ATRASO_FILTROS_MS))
    await responder(worker)

    expect(worker.consultas).toHaveLength(antes + 1)
    expect(ultimaConsulta(worker)).toMatchObject({ filtros: { cpfPis: '00000000025' }, offset: 0 })
    expect(result.current.consulta.paginacao.pagina).toBe(1)
    expect(result.current.consulta.total).toBe(1)
    expect(result.current.consulta.itens[0].cpfPis).toBe('000000000025')
  })

  it('deve aplicar a ordem na hora, voltando para a página 1', async () => {
    const { result, worker } = await montarPronto()
    act(() => result.current.consulta.paginacao.irPara(2))
    await responder(worker)

    act(() => result.current.consulta.filtros.mudarOrdem('desc'))
    await responder(worker)

    expect(ultimaConsulta(worker)).toMatchObject({ ordem: 'data-decrescente', offset: 0 })
    expect(result.current.consulta.itens[0].nsr).toBe('000000025')
  })

  it('não deve ter contagem de operações fora da aba de empregados', async () => {
    const { result } = await montarPronto()

    expect(result.current.consulta.contagemOperacoes).toBeNull()
  })

  it('deve filtrar empregados pela operação e expor a contagem por operação', async () => {
    const fabrica = fabricaDeWorkersFalsos()
    const wrapper = ({ children }: { children: ReactNode }) => (
      <AfdProvider criarWorker={fabrica.criarWorker}>{children}</AfdProvider>
    )
    const { result } = renderHook(() => ({ afd: useAfd(), consulta: useConsultaAfd('empregados') }), { wrapper })
    act(() => result.current.afd.carregarArquivo(arquivo('a.txt')))
    const worker = fabrica.criados[0]
    act(() => worker.concluir(parsearAfd(EMPREGADOS)))
    await responder(worker)

    act(() => result.current.consulta.filtros.mudarOperacao('A'))
    await responder(worker)

    expect(ultimaConsulta(worker)).toMatchObject({ aba: 'empregados', filtros: { operacao: 'A' }, offset: 0 })
    expect(result.current.consulta.total).toBe(1)
    expect(result.current.consulta.contagemOperacoes).toEqual({ I: 2, A: 1, E: 0 })
  })

  it('deve filtrar eventos pelo código', async () => {
    const { result, worker } = await montarPronto()

    act(() => result.current.consulta.filtros.mudarCodigoEvento('07'))

    expect(ultimaConsulta(worker)).toMatchObject({ filtros: { codigoEvento: '07' }, offset: 0 })
  })

  it('deve voltar para a página 1 e esvaziar a lista ao trocar de arquivo, mantendo os filtros', async () => {
    const { result, criados, worker } = await montarPronto()
    act(() => result.current.consulta.paginacao.irPara(2))
    await responder(worker)
    act(() => result.current.consulta.filtros.mudarNome('desconhecido'))
    act(() => vi.advanceTimersByTime(ATRASO_FILTROS_MS))
    await responder(worker)

    act(() => result.current.afd.carregarArquivo(arquivo('b.txt')))
    expect(result.current.consulta).toMatchObject({ itens: [], total: 0, carregando: false })

    act(() => criados[1].concluir(parsearAfd(MARCACOES.slice(0, 3))))
    expect(ultimaConsulta(criados[1])).toMatchObject({ filtros: { nome: 'desconhecido' }, offset: 0 })
    await responder(criados[1])

    expect(result.current.consulta.paginacao.pagina).toBe(1)
    expect(result.current.consulta.total).toBe(3)
  })

  it('deve encerrar o carregamento sem erro quando outra consulta substitui a sua', async () => {
    const fabrica = fabricaDeWorkersFalsos()
    const wrapper = ({ children }: { children: ReactNode }) => (
      <AfdProvider criarWorker={fabrica.criarWorker}>{children}</AfdProvider>
    )
    const { result } = renderHook(
      () => ({ afd: useAfd(), eventos: useConsultaAfd('eventosRep'), marcacoes: useConsultaAfd('marcacoes') }),
      { wrapper },
    )
    act(() => result.current.afd.carregarArquivo(arquivo('a.txt')))
    const worker = fabrica.criados[0]

    await act(async () => worker.concluir(parsearAfd(MARCACOES)))
    await responder(worker)

    expect(result.current.eventos).toMatchObject({ carregando: false, erro: null })
    expect(result.current.marcacoes).toMatchObject({ carregando: false, total: 25 })
  })

  describe('exportarCsv', () => {
    afterEach(() => {
      vi.restoreAllMocks()
    })

    it('deve exportar com os filtros aplicados e a ordem atual, sem página, e baixar o arquivo', async () => {
      const baixados: string[] = []
      Object.assign(URL, { createObjectURL: () => 'blob:csv', revokeObjectURL: () => {} })
      vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
        baixados.push(this.download)
      })
      const { result, worker } = await montarPronto()
      act(() => result.current.consulta.filtros.mudarCpfPis('25'))
      act(() => vi.advanceTimersByTime(ATRASO_FILTROS_MS))
      act(() => result.current.consulta.filtros.mudarOrdem('desc'))

      act(() => result.current.consulta.exportarCsv())
      expect(result.current.consulta.exportando).toBe(true)
      await act(async () => worker.responderExportacao(worker.exportacoes[0], new Date(7)))

      expect(worker.exportacoes[0]).toMatchObject({
        formato: 'csv',
        criterio: { aba: 'marcacoes', filtros: { cpfPis: '25' }, ordem: 'data-decrescente' },
      })
      expect(worker.exportacoes[0]).not.toHaveProperty('criterio.offset')
      expect(baixados).toEqual(['afd_marcacoes_7.csv'])
      expect(result.current.consulta).toMatchObject({ exportando: false, erroExportacao: null })
    })

    it('deve expor o erro de uma exportação que falha', async () => {
      const { result, worker } = await montarPronto()

      act(() => result.current.consulta.exportarCsv())
      await act(async () =>
        worker.responder({
          token: worker.pedidos[0].token,
          tipo: 'erroExportacao',
          idExportacao: worker.exportacoes[0].idExportacao,
          mensagem: 'Não foi possível exportar: sem memória',
        }),
      )

      expect(result.current.consulta).toMatchObject({
        exportando: false,
        erroExportacao: 'Não foi possível exportar: sem memória',
      })
    })

    it('não deve mostrar erro quando o arquivo é trocado no meio da exportação', async () => {
      const { result } = await montarPronto()

      act(() => result.current.consulta.exportarCsv())
      await act(async () => result.current.afd.carregarArquivo(arquivo('b.txt')))

      expect(result.current.consulta).toMatchObject({ exportando: false, erroExportacao: null })
    })
  })

  it('deve expor o erro de uma consulta que falha', async () => {
    const consultar: ConsultarAfd = () => Promise.reject(new Error('worker sem resposta'))
    const valor: ValorAfdContext = {
      arquivo: arquivo('a.txt'),
      resumo: null,
      status: 'pronto',
      progresso: 100,
      erro: null,
      carregarArquivo: () => {},
      consultar,
      exportar: () => Promise.reject(new Error('sem exportação neste teste')),
    }
    const wrapper = ({ children }: { children: ReactNode }) => (
      <AfdContext.Provider value={valor}>{children}</AfdContext.Provider>
    )

    const { result } = renderHook(() => useConsultaAfd('marcacoes'), { wrapper })
    await act(async () => {})

    expect(result.current).toMatchObject({ erro: 'worker sem resposta', carregando: false, itens: [] })
  })
})
