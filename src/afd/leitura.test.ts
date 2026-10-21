// @vitest-environment node
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { calcularProgresso, lerArquivoAfd, mensagemDeErro } from './leitura'
import type { FonteAfd } from './leitura'
import { decodificarAfd, parsearAfd } from './parser'

const lerFixture = (nome: string) => new Uint8Array(readFileSync(join(__dirname, '__fixtures__', nome)))

/** Fonte que entrega os bytes em chunks do tamanho pedido. */
function fonteEmChunks(bytes: Uint8Array<ArrayBuffer>, tamanhoChunk: number): FonteAfd {
  return {
    size: bytes.byteLength,
    stream: () =>
      new ReadableStream<Uint8Array<ArrayBuffer>>({
        start(controle) {
          for (let i = 0; i < bytes.byteLength; i += tamanhoChunk) {
            controle.enqueue(bytes.slice(i, i + tamanhoChunk))
          }
          controle.close()
        },
      }),
  }
}

describe('calcularProgresso', () => {
  it('deve devolver o percentual inteiro, arredondado para baixo', () => {
    expect(calcularProgresso(1, 3)).toBe(33)
    expect(calcularProgresso(3, 3)).toBe(100)
  })

  it('deve considerar 100% um arquivo vazio', () => {
    expect(calcularProgresso(0, 0)).toBe(100)
  })

  it('deve limitar a 100 quando os bytes lidos passam do tamanho declarado', () => {
    expect(calcularProgresso(12, 10)).toBe(100)
  })
})

describe('mensagemDeErro', () => {
  it('deve usar a mensagem do Error', () => {
    expect(mensagemDeErro(new Error('disco removido'))).toBe('Não foi possível ler o arquivo: disco removido')
  })

  it('deve aceitar valor que não é Error', () => {
    expect(mensagemDeErro('falhou')).toBe('Não foi possível ler o arquivo: falhou')
  })
})

describe('lerArquivoAfd', () => {
  it.each(['afd-671.txt', 'afd-595.txt', 'afd-1510.txt'])(
    'deve produzir em %s o mesmo relatório da leitura inteira, com chunks de 7 bytes',
    async (nome) => {
      const bytes = lerFixture(nome)

      const relatorio = await lerArquivoAfd(fonteEmChunks(bytes, 7), () => {})

      expect(relatorio).toEqual(parsearAfd(decodificarAfd(bytes)))
    },
  )

  it('deve preservar o acento de um caractere que chega sozinho num chunk', async () => {
    const bytes = lerFixture('afd-671.txt')

    const relatorio = await lerArquivoAfd(fonteEmChunks(bytes, 1), () => {})

    expect(relatorio.empregados.map((e) => e.nome).join(' ')).toMatch(/[ÇÃ]/)
    expect(relatorio).toEqual(parsearAfd(decodificarAfd(bytes)))
  })

  it('deve emitir progresso crescente, sem repetir, terminando em 100', async () => {
    const bytes = lerFixture('afd-595.txt')
    const progressos: number[] = []

    await lerArquivoAfd(fonteEmChunks(bytes, 64), (p) => progressos.push(p))

    expect(progressos.length).toBeGreaterThan(2)
    expect(progressos[progressos.length - 1]).toBe(100)
    expect(progressos).toEqual([...new Set(progressos)].sort((a, b) => a - b))
  })

  it('deve ler a última linha de um arquivo sem quebra de linha no fim', async () => {
    // Tipo 3 legado: NSR, tipo, data ddmmaaaa, hora hhmm, PIS de 12 posições
    const marcacao = (nsr: string) => `${nsr}3010120200800123456789012`
    const bytes = new TextEncoder().encode(`${marcacao('000000001')}\n${marcacao('000000002')}`)

    const relatorio = await lerArquivoAfd(fonteEmChunks(bytes, 5), () => {})

    expect(relatorio.marcacoes.map((m) => m.nsr)).toEqual(['000000001', '000000002'])
  })

  it('deve emitir 100 e devolver relatório vazio para arquivo vazio', async () => {
    const progressos: number[] = []

    const relatorio = await lerArquivoAfd(fonteEmChunks(new Uint8Array(), 10), (p) => progressos.push(p))

    expect(progressos).toEqual([100])
    expect(relatorio.totalLinhas).toBe(0)
    expect(relatorio.portaria).toBeNull()
  })

  it('deve rejeitar quando o stream falha', async () => {
    const fonte: FonteAfd = {
      size: 10,
      stream: () =>
        new ReadableStream<Uint8Array<ArrayBuffer>>({
          start(controle) {
            controle.error(new Error('arquivo removido'))
          },
        }),
    }

    await expect(lerArquivoAfd(fonte, () => {})).rejects.toThrow('arquivo removido')
  })
})
