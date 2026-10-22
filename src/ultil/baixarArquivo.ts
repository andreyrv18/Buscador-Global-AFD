// Entrega ao navegador um arquivo montado pelo worker, como download.

import type { ArquivoExportadoAfd } from '../afd/tipos'

export function baixarArquivo({ arquivo, nomeArquivo }: ArquivoExportadoAfd): void {
  const url = URL.createObjectURL(arquivo)
  const link = document.createElement('a')
  link.href = url
  link.download = nomeArquivo
  document.body.append(link)
  link.click()
  link.remove()
  // O clique já iniciou o download; a URL pode ser liberada em seguida.
  setTimeout(() => URL.revokeObjectURL(url), 0)
}
