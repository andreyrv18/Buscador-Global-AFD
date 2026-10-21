// Worker de leitura do AFD. Só faz a ponte entre mensagens e `lerArquivoAfd`;
// a lógica e os testes estão em leitura.ts e linhas.ts.

import { lerArquivoAfd, mensagemDeErro } from './leitura'
import type { PedidoLeituraAfd, RespostaWorkerAfd } from './tipos'

// O tsconfig usa a lib DOM, onde `self` é a janela. Este é o recorte do escopo
// do worker que usamos, sem misturar a lib WebWorker no projeto todo.
interface EscopoWorkerAfd {
  onmessage: ((evento: MessageEvent<PedidoLeituraAfd>) => void) | null
  postMessage(resposta: RespostaWorkerAfd): void
}

const escopo = self as unknown as EscopoWorkerAfd

escopo.onmessage = (evento) => {
  const { token, arquivo } = evento.data
  lerArquivoAfd(arquivo, (progresso) => escopo.postMessage({ token, tipo: 'progresso', progresso }))
    .then((relatorio) => escopo.postMessage({ token, tipo: 'pronto', relatorio }))
    .catch((erro: unknown) => escopo.postMessage({ token, tipo: 'erro', mensagem: mensagemDeErro(erro) }))
}
