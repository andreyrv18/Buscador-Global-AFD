import { act, render, renderHook, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import { parsearAfd } from '../afd/parser'
import { AfdProvider } from './AfdContext'
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
      relatorio: null,
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
    expect(criados[0].pedidos).toEqual([{ token: expect.any(Number), arquivo: afd }])
  })

  it('deve atualizar o progresso com as mensagens do worker', () => {
    const { result, criados } = montar()
    act(() => result.current.carregarArquivo(arquivo('a.txt')))

    act(() => criados[0].progredir(42))

    expect(result.current.progresso).toBe(42)
    expect(result.current.status).toBe('lendo')
  })

  it('deve guardar o relatório e encerrar o worker ao concluir', () => {
    const { result, criados } = montar()
    const relatorio = parsearAfd('0000000013010120200800123456789012')
    act(() => result.current.carregarArquivo(arquivo('a.txt')))

    act(() => criados[0].concluir(relatorio))

    expect(result.current).toMatchObject({ status: 'pronto', progresso: 100, relatorio, erro: null })
    expect(criados[0].encerrado).toBe(true)
  })

  it('deve passar a "erro" e encerrar o worker quando a leitura falha', () => {
    const { result, criados } = montar()
    act(() => result.current.carregarArquivo(arquivo('a.txt')))

    act(() => criados[0].responder({ token: criados[0].token, tipo: 'erro', mensagem: 'arquivo removido' }))

    expect(result.current).toMatchObject({ status: 'erro', erro: 'arquivo removido', relatorio: null })
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

      expect(result.current).toMatchObject({ status: 'lendo', progresso: 0, relatorio: null, erro: null })
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
      expect(result.current.relatorio).toBe(relatorio)
    })

    it('deve limpar o erro anterior ao carregar outro arquivo', () => {
      const { result, criados } = montar()
      act(() => result.current.carregarArquivo(arquivo('primeiro.txt')))
      act(() => criados[0].falhar('quebrou'))

      act(() => result.current.carregarArquivo(arquivo('segundo.txt')))

      expect(result.current).toMatchObject({ status: 'lendo', erro: null })
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
