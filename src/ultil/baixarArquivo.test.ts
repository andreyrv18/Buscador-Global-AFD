import { afterEach, describe, expect, it, vi } from 'vitest'
import { baixarArquivo } from './baixarArquivo'

afterEach(() => {
  vi.restoreAllMocks()
  vi.useRealTimers()
})

describe('baixarArquivo', () => {
  it('deve clicar num link de download com o nome do arquivo e liberar a URL depois', () => {
    vi.useFakeTimers()
    const criarUrl = vi.fn(() => 'blob:teste')
    const revogarUrl = vi.fn()
    Object.assign(URL, { createObjectURL: criarUrl, revokeObjectURL: revogarUrl })
    const cliques: HTMLAnchorElement[] = []
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      cliques.push(this)
    })
    const arquivo = new Blob(['a;b'], { type: 'text/csv' })

    baixarArquivo({ arquivo, nomeArquivo: 'afd_marcacoes_1.csv' })

    expect(criarUrl).toHaveBeenCalledWith(arquivo)
    expect(cliques).toHaveLength(1)
    expect(cliques[0]).toMatchObject({ download: 'afd_marcacoes_1.csv', href: 'blob:teste' })
    expect(document.querySelector('a[download]')).toBeNull()
    expect(revogarUrl).not.toHaveBeenCalled()

    vi.runAllTimers()

    expect(revogarUrl).toHaveBeenCalledWith('blob:teste')
  })
})
