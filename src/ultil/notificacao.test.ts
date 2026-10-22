import { afterEach, describe, expect, it, vi } from 'vitest'
import { resumirRelatorioAfd } from '../afd/consulta'
import { parsearAfd } from '../afd/parser'
import { mensagemConclusao, notificarConclusao } from './notificacao'

const resumo = resumirRelatorioAfd(parsearAfd(['0000000013010120200800123456789012', '0000000023010120200801123456789012']))

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('mensagemConclusao', () => {
  it('deve citar o arquivo, a portaria e as linhas lidas', () => {
    expect(mensagemConclusao('AFD.txt', resumo)).toBe('AFD.txt: Portaria 1510, 2 linhas lidas.')
  })

  it('deve indicar portaria não identificada', () => {
    expect(mensagemConclusao('vazio.txt', resumirRelatorioAfd(parsearAfd('')))).toBe(
      'vazio.txt: Portaria não identificada, 0 linhas lidas.',
    )
  })
})

describe('notificarConclusao', () => {
  it('não deve fazer nada quando a API do Chrome não existe', () => {
    expect(() => notificarConclusao('AFD.txt', resumo)).not.toThrow()
  })

  it('não deve fazer nada fora da extensão, onde chrome.notifications não existe', () => {
    vi.stubGlobal('chrome', { runtime: {} })

    expect(() => notificarConclusao('AFD.txt', resumo)).not.toThrow()
  })

  it('deve avisar no console, sem lançar, quando o sistema recusa a notificação', async () => {
    const aviso = vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.stubGlobal('chrome', {
      notifications: { create: () => Promise.reject(new Error('notificações desativadas')) },
      runtime: { getURL: (caminho: string) => caminho },
    })

    notificarConclusao('AFD.txt', resumo)
    await vi.waitFor(() => expect(aviso).toHaveBeenCalledTimes(1))

    expect(aviso).toHaveBeenCalledWith('Não foi possível mostrar a notificação de conclusão.', expect.any(Error))
  })
})
