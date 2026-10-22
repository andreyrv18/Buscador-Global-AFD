import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ATRASO_FILTROS_MS, useFiltrosAfd } from './useFiltrosAfd'

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

function montar() {
  const aoMudar = vi.fn()
  const hook = renderHook(() => useFiltrosAfd({ aoMudar }))
  return { aoMudar, ...hook }
}

describe('useFiltrosAfd', () => {
  it('deve começar sem filtros e em ordem crescente de data', () => {
    const { result } = montar()

    expect(result.current).toMatchObject({
      campos: { nome: '', cpfPis: '', data: '' },
      aplicados: { nome: '', cpfPis: '', data: '' },
      ordem: 'asc',
      ordemConsulta: 'data-crescente',
    })
  })

  it('deve mostrar o campo na hora e aplicá-lo só depois do debounce', () => {
    const { result, aoMudar } = montar()

    act(() => result.current.mudarNome('maria'))
    expect(result.current.campos.nome).toBe('maria')
    expect(result.current.aplicados.nome).toBe('')

    act(() => vi.advanceTimersByTime(ATRASO_FILTROS_MS - 1))
    expect(result.current.aplicados.nome).toBe('')
    expect(aoMudar).not.toHaveBeenCalled()

    act(() => vi.advanceTimersByTime(1))
    expect(result.current.aplicados.nome).toBe('maria')
    expect(aoMudar).toHaveBeenCalledTimes(1)
  })

  it('deve aplicar uma vez só o último valor de uma digitação contínua', () => {
    const { result, aoMudar } = montar()

    for (const nome of ['m', 'ma', 'mar']) {
      act(() => result.current.mudarNome(nome))
      act(() => vi.advanceTimersByTime(ATRASO_FILTROS_MS / 2))
    }
    act(() => vi.advanceTimersByTime(ATRASO_FILTROS_MS))

    expect(result.current.aplicados.nome).toBe('mar')
    expect(aoMudar).toHaveBeenCalledTimes(1)
  })

  it('deve guardar só os dígitos do CPF/PIS', () => {
    const { result } = montar()

    act(() => result.current.mudarCpfPis('012.345.678-90'))
    act(() => vi.advanceTimersByTime(ATRASO_FILTROS_MS))

    expect(result.current.campos.cpfPis).toBe('01234567890')
    expect(result.current.aplicados.cpfPis).toBe('01234567890')
  })

  it('deve aplicar a data depois do debounce', () => {
    const { result } = montar()

    act(() => result.current.mudarData('2026-01-05'))
    act(() => vi.advanceTimersByTime(ATRASO_FILTROS_MS))

    expect(result.current.aplicados.data).toBe('2026-01-05')
  })

  it('não deve chamar aoMudar quando o campo volta ao valor aplicado antes do debounce', () => {
    const { result, aoMudar } = montar()

    act(() => result.current.mudarNome('m'))
    act(() => result.current.mudarNome(''))
    act(() => vi.advanceTimersByTime(ATRASO_FILTROS_MS))

    expect(aoMudar).not.toHaveBeenCalled()
  })

  it('deve aplicar a ordem na hora', () => {
    const { result, aoMudar } = montar()

    act(() => result.current.mudarOrdem('desc'))

    expect(result.current).toMatchObject({ ordem: 'desc', ordemConsulta: 'data-decrescente' })
    expect(aoMudar).toHaveBeenCalledTimes(1)
  })

  it('deve limpar os campos e aplicar na hora', () => {
    const { result, aoMudar } = montar()
    act(() => result.current.mudarNome('maria'))
    act(() => vi.advanceTimersByTime(ATRASO_FILTROS_MS))

    act(() => result.current.limpar())

    expect(result.current.campos).toEqual({ nome: '', cpfPis: '', data: '' })
    expect(result.current.aplicados).toEqual({ nome: '', cpfPis: '', data: '' })
    expect(aoMudar).toHaveBeenCalledTimes(2)
  })

  it('deve usar o aoMudar mais recente', () => {
    const primeiro = vi.fn()
    const segundo = vi.fn()
    const { result, rerender } = renderHook(({ aoMudar }) => useFiltrosAfd({ aoMudar }), {
      initialProps: { aoMudar: primeiro },
    })

    act(() => result.current.mudarNome('ana'))
    rerender({ aoMudar: segundo })
    act(() => vi.advanceTimersByTime(ATRASO_FILTROS_MS))

    expect(primeiro).not.toHaveBeenCalled()
    expect(segundo).toHaveBeenCalledTimes(1)
  })
})
