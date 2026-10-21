// Leitura do arquivo em chunks: bytes crus → ISO-8859-1 → linhas → parser.
// Roda dentro do worker, mas não depende dele, para poder ser testada.

import { finalizarLinhas, quebrarLinhas } from './linhas'
import { criarParserAfd } from './parser'
import type { RelatorioAfd } from './tipos'

/** O que a leitura precisa de um `File`: o tamanho e o stream de bytes. */
export type FonteAfd = Pick<Blob, 'size' | 'stream'>

/** Percentual inteiro de 0 a 100. Arquivo vazio já está 100% lido. */
export function calcularProgresso(bytesLidos: number, tamanho: number): number {
  if (tamanho <= 0) return 100
  return Math.min(100, Math.floor((bytesLidos * 100) / tamanho))
}

/** Texto para o usuário a partir de um erro de leitura. */
export function mensagemDeErro(erro: unknown): string {
  const detalhe = erro instanceof Error ? erro.message : String(erro)
  return `Não foi possível ler o arquivo: ${detalhe}`
}

/**
 * Lê o arquivo em chunks e devolve o relatório. `aoProgredir` é chamado só
 * quando o percentual inteiro muda, e sempre termina em 100.
 */
export async function lerArquivoAfd(
  fonte: FonteAfd,
  aoProgredir: (percentual: number) => void,
): Promise<RelatorioAfd> {
  const leitor = fonte.stream().getReader()
  const decodificador = new TextDecoder('iso-8859-1')
  const parser = criarParserAfd()
  let resto = ''
  let bytesLidos = 0
  let ultimoPercentual = -1

  const informar = (percentual: number) => {
    if (percentual === ultimoPercentual) return
    ultimoPercentual = percentual
    aoProgredir(percentual)
  }

  const processar = (texto: string) => {
    const quebra = quebrarLinhas(resto, texto)
    for (const linha of quebra.linhas) parser.processarLinha(linha)
    resto = quebra.resto
  }

  for (;;) {
    const { done, value } = await leitor.read()
    if (done) break
    bytesLidos += value.byteLength
    processar(decodificador.decode(value, { stream: true }))
    informar(calcularProgresso(bytesLidos, fonte.size))
  }

  processar(decodificador.decode())
  for (const linha of finalizarLinhas(resto)) parser.processarLinha(linha)
  informar(100)
  return parser.finalizar()
}
