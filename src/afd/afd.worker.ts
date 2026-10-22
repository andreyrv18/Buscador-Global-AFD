// Worker de leitura do AFD. Lê o arquivo, guarda o relatório e responde às
// consultas e exportações da interface; a lógica e os testes estão em
// leitura.ts, consulta.ts e exportacao.ts.

import { criarConsultorAfd, resumirRelatorioAfd } from './consulta'
import type { ConsultorAfd } from './consulta'
import { exportarAfd } from './exportacao'
import { lerArquivoAfd, mensagemDeErro } from './leitura'
import type { PedidoLeituraAfd, RelatorioAfd, RespostaWorkerAfd } from './tipos'

// O tsconfig usa a lib DOM, onde `self` é a janela. Este é o recorte do escopo
// do worker que usamos, sem misturar a lib WebWorker no projeto todo.
interface EscopoWorkerAfd {
  onmessage: ((evento: MessageEvent<PedidoLeituraAfd>) => void) | null
  postMessage(resposta: RespostaWorkerAfd): void
}

const escopo = self as unknown as EscopoWorkerAfd

// Cada worker atende um único arquivo: trocar de arquivo cria outro worker.
let lido: { relatorio: RelatorioAfd; consultor: ConsultorAfd } | null = null

escopo.onmessage = (evento) => {
  const pedido = evento.data
  const { token } = pedido
  switch (pedido.tipo) {
    case 'ler':
      lerArquivoAfd(pedido.arquivo, (progresso) => escopo.postMessage({ token, tipo: 'progresso', progresso }))
        .then((relatorio) => {
          lido = { relatorio, consultor: criarConsultorAfd(relatorio) }
          escopo.postMessage({ token, tipo: 'pronto', resumo: resumirRelatorioAfd(relatorio) })
        })
        .catch((erro: unknown) => escopo.postMessage({ token, tipo: 'erro', mensagem: mensagemDeErro(erro) }))
      break
    case 'consultar': {
      // A interface só consulta depois do 'pronto'; sem relatório, a página é vazia.
      const resultado = lido?.consultor.consultar(pedido) ?? { itens: [], total: 0 }
      escopo.postMessage({ ...resultado, token, tipo: 'resultado', idConsulta: pedido.idConsulta })
      break
    }
    case 'exportar': {
      const { idExportacao } = pedido
      if (lido === null) {
        escopo.postMessage({ token, tipo: 'erroExportacao', idExportacao, mensagem: 'O arquivo ainda não foi lido.' })
        break
      }
      // Uma exportação que falha (memória, por exemplo) não pode derrubar o
      // arquivo já lido: a falha volta só para quem pediu.
      try {
        const exportado = exportarAfd(lido.relatorio, lido.consultor, pedido, new Date())
        escopo.postMessage({ ...exportado, token, tipo: 'exportado', idExportacao })
      } catch (erro: unknown) {
        const detalhe = erro instanceof Error ? erro.message : String(erro)
        escopo.postMessage({ token, tipo: 'erroExportacao', idExportacao, mensagem: `Não foi possível exportar: ${detalhe}` })
      }
      break
    }
  }
}
