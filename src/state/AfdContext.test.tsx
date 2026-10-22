import { act, render, renderHook, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { parsearAfd } from '../afd/parser'
import { resumirRelatorioAfd } from '../afd/consulta'
import { AfdProvider, ConsultaDescartadaErro } from './AfdContext'
import { useAfd } from './useAfd'
import { fabricaDeWorkersFalsos, relatorioVazio } from './WorkerAfdFalso'

const arquivo = (nome: string) => new File(['conteudo'], nome, { type: 'text/plain' })

function montar() {
  const fabrica = fabricaDeWorkersFalsos()
  const wrapper = ({ children }: { children: ReactNode }) => (
    <AfdProvider criarWorker={fabrica.criarWorker}>{children}</AfdProvider>
  )
  const hook = renderHook(() => useAfd(), { wrapper })
  return { ...fabrica, ...hook }
}

describe('AfdContext', () => {
  it('deve começar ocioso, sem arquivo nem relatório', () => {
    const { result } = montar()

    expect(result.current).toMatchObject({
      arquivo: null,
      resumo: null,
      status: 'ocioso',
      progresso: 0,
      erro: null,
    })
  })

  it('deve enviar o arquivo ao worker com um token e passar a "lendo"', () => {
    const { result, criados } = montar()
    const afd = arquivo('a.txt')

    act(() => result.current.carregarArquivo(afd))

    expect(result.current.status).toBe('lendo')
    expect(result.current.arquivo).toBe(afd)
    expect(criados).toHaveLength(1)
    expect(criados[0].pedidos).toEqual([{ tipo: 'ler', token: expect.any(Number), arquivo: afd }])
  })

  it('deve atualizar o progresso com as mensagens do worker', () => {
    const { result, criados } = montar()
    act(() => result.current.carregarArquivo(arquivo('a.txt')))

    act(() => criados[0].progredir(42))

    expect(result.current.progresso).toBe(42)
    expect(result.current.status).toBe('lendo')
  })

  it('deve guardar o resumo e manter o worker vivo ao concluir', () => {
    const { result, criados } = montar()
    const relatorio = parsearAfd('0000000013010120200800123456789012')
    act(() => result.current.carregarArquivo(arquivo('a.txt')))

    act(() => criados[0].concluir(relatorio))

    expect(result.current).toMatchObject({
      status: 'pronto',
      progresso: 100,
      resumo: resumirRelatorioAfd(relatorio),
      erro: null,
    })
    expect(result.current.resumo).not.toHaveProperty('marcacoes')
    expect(criados[0].encerrado).toBe(false)
  })

  it('deve passar a "erro" e encerrar o worker quando a leitura falha', () => {
    const { result, criados } = montar()
    act(() => result.current.carregarArquivo(arquivo('a.txt')))

    act(() => criados[0].responder({ token: criados[0].token, tipo: 'erro', mensagem: 'arquivo removido' }))

    expect(result.current).toMatchObject({ status: 'erro', erro: 'arquivo removido', resumo: null })
    expect(criados[0].encerrado).toBe(true)
  })

  it('deve passar a "erro" e encerrar o worker quando o worker quebra', () => {
    const { result, criados } = montar()
    act(() => result.current.carregarArquivo(arquivo('a.txt')))

    act(() => criados[0].falhar('script inválido'))

    expect(result.current.status).toBe('erro')
    expect(result.current.erro).toBe('Falha no processamento do arquivo: script inválido')
    expect(criados[0].encerrado).toBe(true)
  })

  it('deve passar a "erro" quando o worker não pode ser criado', () => {
    const wrapper = ({ children }: { children: ReactNode }) => (
      <AfdProvider
        criarWorker={() => {
          throw new Error('Worker indisponível')
        }}
      >
        {children}
      </AfdProvider>
    )
    const { result } = renderHook(() => useAfd(), { wrapper })

    act(() => result.current.carregarArquivo(arquivo('a.txt')))

    expect(result.current.status).toBe('erro')
    expect(result.current.erro).toBe('Não foi possível iniciar o processamento: Worker indisponível')
  })

  describe('troca de arquivo', () => {
    it('deve encerrar o worker anterior e usar um token novo', () => {
      const { result, criados } = montar()
      act(() => result.current.carregarArquivo(arquivo('primeiro.txt')))
      act(() => result.current.carregarArquivo(arquivo('segundo.txt')))

      expect(criados).toHaveLength(2)
      expect(criados[0].encerrado).toBe(true)
      expect(criados[1].encerrado).toBe(false)
      expect(criados[1].token).not.toBe(criados[0].token)
      expect(result.current.arquivo?.name).toBe('segundo.txt')
    })

    it('deve descartar o resultado atrasado do arquivo anterior', () => {
      const { result, criados } = montar()
      act(() => result.current.carregarArquivo(arquivo('primeiro.txt')))
      act(() => criados[0].progredir(80))
      act(() => result.current.carregarArquivo(arquivo('segundo.txt')))

      act(() => {
        criados[0].progredir(90)
        criados[0].concluir(parsearAfd('0000000013010120200800123456789012'))
        criados[0].falhar('tarde demais')
      })

      expect(result.current).toMatchObject({ status: 'lendo', progresso: 0, resumo: null, erro: null })
    })

    it('deve descartar mensagem com token antigo, mesmo vinda do worker atual', () => {
      const { result, criados } = montar()
      act(() => result.current.carregarArquivo(arquivo('primeiro.txt')))
      const tokenAntigo = criados[0].token
      act(() => result.current.carregarArquivo(arquivo('segundo.txt')))

      act(() => criados[1].concluir(relatorioVazio(), tokenAntigo))

      expect(result.current.status).toBe('lendo')
    })

    it('deve manter o resultado do último arquivo selecionado', () => {
      const { result, criados } = montar()
      const relatorio = parsearAfd('0000000013010120200800123456789012')
      act(() => result.current.carregarArquivo(arquivo('primeiro.txt')))
      act(() => result.current.carregarArquivo(arquivo('segundo.txt')))

      act(() => criados[1].concluir(relatorio))
      act(() => criados[0].concluir(relatorioVazio()))

      expect(result.current.status).toBe('pronto')
      expect(result.current.resumo).toEqual(resumirRelatorioAfd(relatorio))
    })

    it('deve limpar o erro anterior ao carregar outro arquivo', () => {
      const { result, criados } = montar()
      act(() => result.current.carregarArquivo(arquivo('primeiro.txt')))
      act(() => criados[0].falhar('quebrou'))

      act(() => result.current.carregarArquivo(arquivo('segundo.txt')))

      expect(result.current).toMatchObject({ status: 'lendo', erro: null })
    })
  })

  describe('consultar', () => {
    // Três marcações do legado, uma por hora, na ordem do arquivo.
    const TRES_MARCACOES = ['0800', '0900', '1000'].map(
      (hora, i) => `00000000${i + 1}3` + '01012020' + hora + `00000000000${i + 1}`,
    )
    const pagina = (offset: number) =>
      ({ aba: 'marcacoes', filtros: {}, ordem: 'arquivo', offset, limite: 1 }) as const

    function montarPronto() {
      const montado = montar()
      const relatorio = parsearAfd(TRES_MARCACOES)
      act(() => montado.result.current.carregarArquivo(arquivo('a.txt')))
      act(() => montado.criados[0].concluir(relatorio))
      return { ...montado, worker: montado.criados[0], relatorio }
    }

    it('deve pedir a página ao worker e devolver os itens e o total', async () => {
      const { result, worker, relatorio } = montarPronto()

      const consulta = result.current.consultar(pagina(1))
      worker.responderConsulta(worker.consultas[0])

      await expect(consulta).resolves.toEqual({ itens: [relatorio.marcacoes[1]], total: 3 })
      expect(worker.consultas[0]).toMatchObject({ tipo: 'consultar', token: worker.pedidos[0].token, ...pagina(1) })
    })

    it('deve repassar a contagem de operações da aba de empregados', async () => {
      const { result, worker } = montarPronto()

      const consulta = result.current.consultar({ ...pagina(0), aba: 'empregados' })
      worker.responder({
        token: worker.pedidos[0].token,
        tipo: 'resultado',
        idConsulta: worker.consultas[0].idConsulta,
        itens: [],
        total: 0,
        contagemOperacoes: { I: 2, A: 1, E: 0 },
      })

      await expect(consulta).resolves.toEqual({ itens: [], total: 0, contagemOperacoes: { I: 2, A: 1, E: 0 } })
    })

    it('deve descartar a resposta da consulta substituída que chega por último', async () => {
      const { result, worker, relatorio } = montarPronto()
      const antiga = result.current.consultar(pagina(0))
      const atual = result.current.consultar(pagina(2))
      const [pedidoAntigo, pedidoAtual] = worker.consultas

      worker.responderConsulta(pedidoAtual)
      worker.responderConsulta(pedidoAntigo)

      await expect(atual).resolves.toEqual({ itens: [relatorio.marcacoes[2]], total: 3 })
      await expect(antiga).rejects.toBeInstanceOf(ConsultaDescartadaErro)
    })

    it('deve descartar a resposta da consulta substituída que chega primeiro', async () => {
      const { result, worker, relatorio } = montarPronto()
      const antiga = result.current.consultar(pagina(0))
      const atual = result.current.consultar(pagina(2))
      const [pedidoAntigo, pedidoAtual] = worker.consultas

      worker.responderConsulta(pedidoAntigo)
      worker.responderConsulta(pedidoAtual)

      await expect(atual).resolves.toEqual({ itens: [relatorio.marcacoes[2]], total: 3 })
      await expect(antiga).rejects.toBeInstanceOf(ConsultaDescartadaErro)
      expect(pedidoAtual.idConsulta).not.toBe(pedidoAntigo.idConsulta)
    })

    it('deve rejeitar a consulta antes de o arquivo estar pronto', async () => {
      const { result, criados } = montar()
      act(() => result.current.carregarArquivo(arquivo('a.txt')))

      await expect(result.current.consultar(pagina(0))).rejects.toThrow('Nenhum arquivo AFD pronto para consulta.')
      expect(criados[0].consultas).toHaveLength(0)
    })

    it('deve rejeitar a consulta pendente e ignorar a resposta dela ao trocar de arquivo', async () => {
      const { result, worker, criados } = montarPronto()
      const pendente = result.current.consultar(pagina(0))

      act(() => result.current.carregarArquivo(arquivo('b.txt')))
      worker.responderConsulta(worker.consultas[0])

      await expect(pendente).rejects.toBeInstanceOf(ConsultaDescartadaErro)
      expect(worker.encerrado).toBe(true)
      expect(result.current).toMatchObject({ status: 'lendo', resumo: null })
      await expect(result.current.consultar(pagina(0))).rejects.toThrow('Nenhum arquivo AFD pronto')
      expect(criados[1].consultas).toHaveLength(0)
    })

    it('deve rejeitar a consulta pendente quando o worker quebra', async () => {
      const { result, worker } = montarPronto()
      const pendente = result.current.consultar(pagina(0))

      act(() => worker.falhar('sem memória'))

      await expect(pendente).rejects.toBeInstanceOf(ConsultaDescartadaErro)
      expect(result.current.status).toBe('erro')
    })
  })

  describe('exportar', () => {
    const LINHA = '0000000013010120200800123456789012'

    function montarPronto() {
      const montado = montar()
      act(() => montado.result.current.carregarArquivo(arquivo('a.txt')))
      act(() => montado.criados[0].concluir(parsearAfd(LINHA)))
      return { ...montado, worker: montado.criados[0] }
    }

    it('deve pedir o arquivo ao worker e devolver o Blob montado lá', async () => {
      const { result, worker } = montarPronto()

      const exportacao = result.current.exportar({ formato: 'json' })
      worker.responderExportacao(worker.exportacoes[0], new Date(42))
      const exportado = await exportacao

      expect(worker.exportacoes[0]).toMatchObject({ tipo: 'exportar', formato: 'json', token: worker.pedidos[0].token })
      expect(exportado.nomeArquivo).toBe('auditoria_afd_42.json')
      expect(exportado.arquivo).toBeInstanceOf(Blob)
    })

    it('deve atender exportações simultâneas cada uma com sua resposta', async () => {
      const { result, worker } = montarPronto()
      const criterio = { aba: 'marcacoes', filtros: {}, ordem: 'arquivo' } as const

      const json = result.current.exportar({ formato: 'json' })
      const csv = result.current.exportar({ formato: 'csv', criterio })
      const [pedidoJson, pedidoCsv] = worker.exportacoes
      worker.responderExportacao(pedidoCsv)
      worker.responderExportacao(pedidoJson)

      await expect(csv).resolves.toMatchObject({ nomeArquivo: expect.stringMatching(/^afd_marcacoes_\d+\.csv$/) })
      await expect(json).resolves.toMatchObject({ nomeArquivo: expect.stringMatching(/^auditoria_afd_\d+\.json$/) })
    })

    it('não deve descartar a consulta pendente ao exportar', async () => {
      const { result, worker } = montarPronto()

      const consulta = result.current.consultar({ aba: 'marcacoes', filtros: {}, ordem: 'arquivo', offset: 0, limite: 10 })
      const exportacao = result.current.exportar({ formato: 'json' })
      worker.responderExportacao(worker.exportacoes[0])
      worker.responderConsulta(worker.consultas[0])

      await expect(consulta).resolves.toMatchObject({ total: 1 })
      await expect(exportacao).resolves.toMatchObject({ nomeArquivo: expect.any(String) })
    })

    it('deve rejeitar com a mensagem do worker quando a exportação falha', async () => {
      const { result, worker } = montarPronto()

      const exportacao = result.current.exportar({ formato: 'json' })
      worker.responder({
        token: worker.pedidos[0].token,
        tipo: 'erroExportacao',
        idExportacao: worker.exportacoes[0].idExportacao,
        mensagem: 'Não foi possível exportar: sem memória',
      })

      await expect(exportacao).rejects.toThrow('Não foi possível exportar: sem memória')
      expect(result.current.status).toBe('pronto')
    })

    it('deve rejeitar antes de o arquivo estar pronto', async () => {
      const { result, criados } = montar()
      act(() => result.current.carregarArquivo(arquivo('a.txt')))

      await expect(result.current.exportar({ formato: 'json' })).rejects.toThrow('Nenhum arquivo AFD pronto para exportação.')
      expect(criados[0].exportacoes).toHaveLength(0)
    })

    it('deve rejeitar as exportações pendentes ao trocar de arquivo', async () => {
      const { result, worker } = montarPronto()
      const exportacao = result.current.exportar({ formato: 'json' })

      act(() => result.current.carregarArquivo(arquivo('b.txt')))
      worker.responderExportacao(worker.exportacoes[0])

      await expect(exportacao).rejects.toBeInstanceOf(ConsultaDescartadaErro)
    })
  })

  describe('notificação', () => {
    afterEach(() => {
      vi.unstubAllGlobals()
    })

    it('deve notificar a conclusão com o nome do arquivo e a portaria', () => {
      const create = vi.fn(() => Promise.resolve('id'))
      vi.stubGlobal('chrome', {
        notifications: { create },
        runtime: { getURL: (caminho: string) => `chrome-extension://abc/${caminho}` },
      })
      const { result, criados } = montar()
      act(() => result.current.carregarArquivo(arquivo('AFD0001.txt')))

      act(() => criados[0].concluir(parsearAfd('0000000013010120200800123456789012')))

      expect(create).toHaveBeenCalledTimes(1)
      expect(create).toHaveBeenCalledWith({
        type: 'basic',
        iconUrl: 'chrome-extension://abc/icons/icon48.png',
        title: 'Processamento do AFD concluído',
        message: 'AFD0001.txt: Portaria 1510, 1 linha lida.',
      })
    })

    it('não deve notificar quando a leitura falha', () => {
      const create = vi.fn(() => Promise.resolve('id'))
      vi.stubGlobal('chrome', { notifications: { create }, runtime: { getURL: (caminho: string) => caminho } })
      const { result, criados } = montar()
      act(() => result.current.carregarArquivo(arquivo('a.txt')))

      act(() => criados[0].falhar('quebrou'))

      expect(create).not.toHaveBeenCalled()
    })

    it('deve concluir normalmente sem a API de notificações', () => {
      const { result, criados } = montar()
      act(() => result.current.carregarArquivo(arquivo('a.txt')))

      act(() => criados[0].concluir())

      expect(result.current.status).toBe('pronto')
    })
  })

  it('deve encerrar o worker ao desmontar', () => {
    const { result, criados, unmount } = montar()
    act(() => result.current.carregarArquivo(arquivo('a.txt')))

    unmount()

    expect(criados[0].encerrado).toBe(true)
  })

  it('deve lançar erro quando useAfd é usado fora do AfdProvider', () => {
    function SemProvider() {
      useAfd()
      return null
    }
    const erroDoConsole = console.error
    console.error = () => {}
    try {
      expect(() => render(<SemProvider />)).toThrow('useAfd precisa ser usado dentro de <AfdProvider>')
    } finally {
      console.error = erroDoConsole
    }
  })

  it('deve entregar o mesmo estado a todos os consumidores', () => {
    const { criarWorker } = fabricaDeWorkersFalsos()
    function Status() {
      return <span>{useAfd().status}</span>
    }
    function Botao() {
      const { carregarArquivo } = useAfd()
      return <button onClick={() => carregarArquivo(arquivo('a.txt'))}>carregar</button>
    }
    render(
      <AfdProvider criarWorker={criarWorker}>
        <Status />
        <Status />
        <Botao />
      </AfdProvider>,
    )

    act(() => screen.getByRole('button').click())

    expect(screen.getAllByText('lendo')).toHaveLength(2)
  })
})
