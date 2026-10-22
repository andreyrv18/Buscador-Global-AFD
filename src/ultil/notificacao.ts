// Aviso do sistema ao terminar a leitura do AFD (permissão `notifications`).
// Fora da extensão — testes, `npm run dev` numa aba comum — a API não existe e
// o aviso é simplesmente omitido.

import type { ResumoAfd } from '../afd/tipos'

const ICONE = 'icons/icon48.png'

export function mensagemConclusao(nomeArquivo: string, resumo: ResumoAfd): string {
  const portaria = resumo.portaria ? `Portaria ${resumo.portaria}` : 'Portaria não identificada'
  const linhas = resumo.totalLinhas.toLocaleString('pt-BR')
  return `${nomeArquivo}: ${portaria}, ${linhas} ${resumo.totalLinhas === 1 ? 'linha lida' : 'linhas lidas'}.`
}

export function notificarConclusao(nomeArquivo: string, resumo: ResumoAfd): void {
  const notificacoes = typeof chrome === 'undefined' ? undefined : chrome.notifications
  if (notificacoes === undefined) return
  notificacoes
    .create({
      type: 'basic',
      iconUrl: chrome.runtime.getURL(ICONE),
      title: 'Processamento do AFD concluído',
      message: mensagemConclusao(nomeArquivo, resumo),
    })
    // A notificação é um extra: se o sistema recusar, a leitura continua valendo.
    .catch((erro: unknown) => console.warn('Não foi possível mostrar a notificação de conclusão.', erro))
}
