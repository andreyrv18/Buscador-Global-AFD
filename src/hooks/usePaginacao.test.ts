import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { calcularTotalPaginas, usePaginacao } from './usePaginacao'

describe('calcularTotalPaginas', () => {
  it('deve arredondar para cima', () => {
    expect(calcularTotalPaginas(21, 10)).toBe(3)
    expect(calcularTotalPaginas(20, 10)).toBe(2)
  })

  it('deve devolver ao menos uma página quando não há itens', () => {
    expect(calcularTotalPaginas(0, 10)).toBe(1)
  })
})

describe('usePaginacao', () => {
  it('deve começar na página 1 com 10 itens por página', () => {
    const { result } = renderHook(() => usePaginacao(95))

    expect(result.current).toMatchObject({ pagina: 1, tamanho: 10, offset: 0, limite: 10, totalPaginas: 10 })
  })

  it('deve aceitar outro tamanho inicial', () => {
    const { result } = renderHook(() => usePaginacao(95, 50))

    expect(result.current).toMatchObject({ tamanho: 50, limite: 50, totalPaginas: 2 })
  })

  it('deve calcular o offset da página escolhida', () => {
    const { result } = renderHook(() => usePaginacao(95))

    act(() => result.current.irPara(3))

    expect(result.current).toMatchObject({ pagina: 3, offset: 20, limite: 10 })
  })

  it('deve limitar a página ao intervalo existente', () => {
    const { result } = renderHook(() => usePaginacao(95))

    act(() => result.current.irPara(99))
    expect(result.current.pagina).toBe(10)

    act(() => result.current.irPara(0))
    expect(result.current.pagina).toBe(1)
  })

  it('deve voltar para a página 1 ao trocar o tamanho', () => {
    const { result } = renderHook(() => usePaginacao(950))
    act(() => result.current.irPara(4))

    act(() => result.current.mudarTamanho(100))

    expect(result.current).toMatchObject({ pagina: 1, tamanho: 100, offset: 0, limite: 100, totalPaginas: 10 })
  })

  it('deve recalcular o total de páginas quando o total muda', () => {
    const { result, rerender } = renderHook(({ total }) => usePaginacao(total), { initialProps: { total: 0 } })
    expect(result.current.totalPaginas).toBe(1)

    rerender({ total: 501 })

    expect(result.current.totalPaginas).toBe(51)
  })
})
