// Consulta aos registros do relatório: filtra, ordena e fatia uma aba.
// Roda dentro do worker, que guarda o relatório; não depende dele, para poder
// ser testada.

import { normalizarDocumento } from './parser'
import type {
  ConsultaAfd,
  FiltrosAfd,
  OperacaoEmpregado,
  OrdemAfd,
  RegistroConsultavel,
  RelatorioAfd,
  ResultadoConsultaAfd,
  ResumoAfd,
} from './tipos'

/** O que a interface guarda do relatório; as coleções ficam no worker. */
export function resumirRelatorioAfd(relatorio: RelatorioAfd): ResumoAfd {
  return {
    portaria: relatorio.portaria,
    leiauteMisto: relatorio.leiauteMisto,
    cabecalho: relatorio.cabecalho,
    contagemPorTipo: relatorio.contagemPorTipo,
    contagemOperacoes: relatorio.contagemOperacoes,
    totalLinhas: relatorio.totalLinhas,
    linhasIgnoradas: relatorio.linhasIgnoradas,
    totalLinhasInvalidas: relatorio.totalLinhasInvalidas,
    linhasInvalidas: relatorio.linhasInvalidas,
  }
}

/** Texto para busca: maiúsculo e sem acentos. */
export function normalizarTexto(texto: string): string {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase()
}

interface FiltrosNormalizados {
  nome: string
  cpfPis: string
  data: string
  operacao: OperacaoEmpregado | null
  codigoEvento: string
}

function normalizarFiltros(filtros: FiltrosAfd): FiltrosNormalizados {
  return {
    nome: normalizarTexto(filtros.nome?.trim() ?? ''),
    cpfPis: normalizarDocumento(filtros.cpfPis ?? ''),
    data: filtros.data?.trim() ?? '',
    operacao: filtros.operacao ?? null,
    codigoEvento: filtros.codigoEvento?.trim() ?? '',
  }
}

function semFiltro(filtros: FiltrosNormalizados): boolean {
  return (
    filtros.nome === '' &&
    filtros.cpfPis === '' &&
    filtros.data === '' &&
    filtros.operacao === null &&
    filtros.codigoEvento === ''
  )
}

/** Memoriza uma normalização: nomes e documentos se repetem muito no arquivo. */
function memorizar(normalizar: (valor: string) => string): (valor: string) => string {
  const memoria = new Map<string, string>()
  return (valor) => {
    let normalizado = memoria.get(valor)
    if (normalizado === undefined) {
      normalizado = normalizar(valor)
      memoria.set(valor, normalizado)
    }
    return normalizado
  }
}

const colador = new Intl.Collator('pt-BR', { sensitivity: 'base' })

const momento = (registro: RegistroConsultavel) => `${registro.dataHora.data}T${registro.dataHora.hora}`

function comparador(
  ordem: OrdemAfd,
): ((a: RegistroConsultavel, b: RegistroConsultavel) => number) | null {
  switch (ordem) {
    case 'arquivo':
      return null
    case 'data-crescente':
      return (a, b) => momento(a).localeCompare(momento(b)) || a.linha - b.linha
    case 'data-decrescente':
      return (a, b) => momento(b).localeCompare(momento(a)) || a.linha - b.linha
    case 'nome':
      return (a, b) => {
        const nomeA = 'nome' in a ? a.nome : ''
        const nomeB = 'nome' in b ? b.nome : ''
        return colador.compare(nomeA, nomeB) || a.linha - b.linha
      }
  }
}

export interface ConsultorAfd {
  consultar(consulta: ConsultaAfd): ResultadoConsultaAfd
}

/**
 * Consultor sobre um relatório. Guarda o último conjunto filtrado e ordenado,
 * para que trocar de página não refaça a filtragem.
 */
export function criarConsultorAfd(relatorio: RelatorioAfd): ConsultorAfd {
  const nomeNormalizado = memorizar(normalizarTexto)
  const documentoNormalizado = memorizar(normalizarDocumento)
  let cache: { chave: string; registros: readonly RegistroConsultavel[] } | null = null

  const passa = (registro: RegistroConsultavel, filtros: FiltrosNormalizados): boolean => {
    if (filtros.data !== '' && registro.dataHora.data !== filtros.data) return false
    switch (registro.tipo) {
      case '3':
      case '5':
      case '7':
        if (filtros.nome !== '' && !nomeNormalizado(registro.nome).includes(filtros.nome)) return false
        if (filtros.cpfPis !== '' && !documentoNormalizado(registro.cpfPis).includes(filtros.cpfPis)) return false
        if (registro.tipo === '5' && filtros.operacao !== null && registro.operacao !== filtros.operacao) return false
        return true
      case '6':
        return filtros.codigoEvento === '' || registro.codigo === filtros.codigoEvento
      case '4':
        return true
    }
  }

  const selecionar = (consulta: ConsultaAfd): readonly RegistroConsultavel[] => {
    const filtros = normalizarFiltros(consulta.filtros)
    const chave = JSON.stringify([consulta.aba, consulta.ordem, filtros])
    if (cache?.chave === chave) return cache.registros

    const todos: readonly RegistroConsultavel[] = relatorio[consulta.aba]
    const filtrados = semFiltro(filtros) ? todos : todos.filter((registro) => passa(registro, filtros))
    const comparar = comparador(consulta.ordem)
    const registros = comparar ? [...filtrados].sort(comparar) : filtrados

    cache = { chave, registros }
    return registros
  }

  // Contagem dos cards da aba de empregados: os demais filtros valem, a
  // operação não, para que cada card mostre quantos teria se fosse escolhido.
  // O Tipo 5 é pequeno perto das marcações; não precisa de cache.
  const contarOperacoes = (filtrosConsulta: FiltrosAfd): Record<OperacaoEmpregado, number> => {
    const filtros = { ...normalizarFiltros(filtrosConsulta), operacao: null }
    const contagem: Record<OperacaoEmpregado, number> = { I: 0, A: 0, E: 0 }
    for (const empregado of relatorio.empregados) {
      if (passa(empregado, filtros)) contagem[empregado.operacao]++
    }
    return contagem
  }

  return {
    consultar(consulta) {
      const registros = selecionar(consulta)
      const inicio = Math.max(0, Math.trunc(consulta.offset))
      const fim = inicio + Math.max(0, Math.trunc(consulta.limite))
      const pagina = { itens: registros.slice(inicio, fim), total: registros.length }
      if (consulta.aba !== 'empregados') return pagina
      return { ...pagina, contagemOperacoes: contarOperacoes(consulta.filtros) }
    },
  }
}
