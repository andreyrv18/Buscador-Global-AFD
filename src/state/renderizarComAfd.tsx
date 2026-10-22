// Auxiliar de teste das views AFD: renderiza dentro do AfdProvider com worker
// falso e deixa o teste carregar um relatório e responder às consultas.

import { act, render } from '@testing-library/react'
import type { ReactElement } from 'react'
import type { RelatorioAfd } from '../afd/tipos'
import { AfdProvider } from './AfdContext'
import type { ValorAfdContext } from './AfdContext'
import { useAfd } from './useAfd'
import { fabricaDeWorkersFalsos } from './WorkerAfdFalso'
import type { WorkerAfdFalso } from './WorkerAfdFalso'

export function renderizarComAfd(ui: ReactElement) {
  const fabrica = fabricaDeWorkersFalsos()
  let afd: ValorAfdContext | null = null

  function CapturaAfd() {
    afd = useAfd()
    return null
  }

  const tela = render(
    <AfdProvider criarWorker={fabrica.criarWorker}>
      <CapturaAfd />
      {ui}
    </AfdProvider>,
  )

  /** Worker do arquivo mais recente. */
  const worker = (): WorkerAfdFalso => {
    const ultimo = fabrica.criados[fabrica.criados.length - 1]
    if (ultimo === undefined) throw new Error('nenhum arquivo foi carregado')
    return ultimo
  }

  /** Responde à consulta mais recente com o relatório carregado. */
  const responder = async () => {
    const consultas = worker().consultas
    const ultima = consultas[consultas.length - 1]
    if (ultima === undefined) throw new Error('a view não fez nenhuma consulta')
    await act(async () => worker().responderConsulta(ultima))
  }

  /** Carrega um arquivo, conclui a leitura com `relatorio` e responde à primeira consulta. */
  const carregar = async (relatorio: RelatorioAfd, nome = 'AFD.txt') => {
    act(() => {
      if (afd === null) throw new Error('AfdProvider não montado')
      afd.carregarArquivo(new File(['x'], nome))
    })
    act(() => worker().concluir(relatorio))
    await responder()
  }

  return { ...tela, ...fabrica, worker, carregar, responder }
}
