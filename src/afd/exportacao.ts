// Exportação do AFD em JSON e CSV. Roda dentro do worker, que guarda os
// registros: o arquivo é montado aqui e só o Blob pronto vai para a interface.
//
// Os dois formatos são montados em pedaços (um por registro), juntados em
// blocos de ~1 MB pelo MontadorDeBlob: nunca uma string única com o arquivo
// inteiro, que num AFD de 1,5 milhão de linhas passaria do limite.

import type { ConsultorAfd } from './consulta'
import { formatarData, formatarHora } from './formatacao'
import { DESCRICOES_COLETORES, DESCRICOES_OPERACOES } from './parser'
import type {
  AbaAfd,
  ArquivoExportadoAfd,
  Marcacao,
  PedidoExportacaoAfd,
  RegistroConsultavel,
  RegistroTipo4,
  RegistroTipo5,
  RegistroTipo6,
  RelatorioAfd,
} from './tipos'

/** Tamanho, em caracteres, de cada bloco entregue ao Blob. */
export const TAMANHO_BLOCO = 1 << 20

/**
 * Junta pedaços pequenos em blocos de ~1 MB. O Blob não aceita bem milhões
 * de pedaços (um por registro): cada um vira um item interno, e o Chrome leva
 * minutos para montá-lo. Uma string única com o arquivo inteiro também não
 * serve (passa do limite de tamanho). Blocos ficam no meio-termo.
 */
export class MontadorDeBlob {
  private readonly blocos: string[] = []
  private pendentes: string[] = []
  private tamanhoPendente = 0

  constructor(private readonly tamanhoBloco = TAMANHO_BLOCO) {}

  adicionar(pedaco: string): void {
    this.pendentes.push(pedaco)
    this.tamanhoPendente += pedaco.length
    if (this.tamanhoPendente >= this.tamanhoBloco) this.fecharBloco()
  }

  montar(tipo: string): Blob {
    this.fecharBloco()
    return new Blob(this.blocos, { type: tipo })
  }

  /** Quantos blocos o Blob terá (para teste). */
  get totalBlocos(): number {
    return this.blocos.length + (this.pendentes.length > 0 ? 1 : 0)
  }

  private fecharBloco(): void {
    if (this.pendentes.length === 0) return
    this.blocos.push(this.pendentes.join(''))
    this.pendentes = []
    this.tamanhoPendente = 0
  }
}

// ---------------------------------------------------------------------------
// JSON
// ---------------------------------------------------------------------------

// Os registros mantêm os nomes de campo da 3.8 (`dataHora`, `horaFormatada`,
// `detalhes`...), para não quebrar quem já lê o arquivo exportado. Campos novos
// só são acrescentados.

const empregadoJson = (registro: RegistroTipo5) => ({
  nsr: registro.nsr,
  dataHora: registro.dataHora.data,
  horaFormatada: registro.dataHora.hora,
  operacao: DESCRICOES_OPERACOES[registro.operacao],
  cpfPis: registro.cpfPis,
  detalhes: registro.nome,
})

const ajusteJson = (registro: RegistroTipo4) => ({
  nsr: registro.nsr,
  dataAntes: registro.antes.data,
  horaAntes: registro.antes.hora,
  dataDepois: registro.depois.data,
  horaDepois: registro.depois.hora,
  // A 3.8 gravava "N/A"; aqui é null quando a Portaria 1510 não traz o campo.
  cpfResponsavel: registro.cpfResponsavel,
})

const eventoJson = (registro: RegistroTipo6) => ({
  nsr: registro.nsr,
  dataHora: `${registro.dataHora.data} ${registro.dataHora.hora}`,
  codigo: registro.codigo,
  descricao: registro.descricao,
})

const marcacaoJson = (registro: Marcacao) => {
  const base = {
    nsr: registro.nsr,
    dataHora: registro.dataHora.data,
    horaFormatada: registro.dataHora.hora,
    cpfPis: registro.cpfPis,
    nome: registro.nome,
  }
  if (registro.tipo === '3') return base
  return { ...base, tipo: '7', coletor: registro.coletor, offline: registro.offline }
}

type CampoJson = (destino: MontadorDeBlob) => void

/** Lista JSON indentada, um registro por linha. */
function listaJson<T>(chave: string, itens: readonly T[], mapear: (item: T) => unknown): CampoJson {
  return (destino) => {
    if (itens.length === 0) {
      destino.adicionar(`  ${JSON.stringify(chave)}: []`)
      return
    }
    destino.adicionar(`  ${JSON.stringify(chave)}: [`)
    itens.forEach((item, i) => destino.adicionar(`${i === 0 ? '' : ','}\n    ${JSON.stringify(mapear(item))}`))
    destino.adicionar('\n  ]')
  }
}

const campoJson =
  (chave: string, valor: unknown): CampoJson =>
  (destino) =>
    destino.adicionar(`  ${JSON.stringify(chave)}: ${JSON.stringify(valor)}`)

/**
 * Relatório completo, equivalente ao da 3.8. A 3.8 gravava cada Tipo 5 duas
 * vezes (em `porData` e em `porCPF`); aqui ele aparece uma vez, em `empregados`.
 * O `porEmpregador` da 3.8, que saía sempre zerado, não é gerado.
 */
export function montarJsonAfd(relatorio: RelatorioAfd): Blob {
  const porOperacao = Object.fromEntries(
    (['I', 'A', 'E'] as const).map((operacao) => [
      DESCRICOES_OPERACOES[operacao],
      relatorio.contagemOperacoes[operacao],
    ]),
  )
  const campos: CampoJson[] = [
    campoJson('portaria', relatorio.portaria),
    campoJson('leiauteMisto', relatorio.leiauteMisto),
    campoJson('totalLinhas', relatorio.totalLinhas),
    campoJson('linhasIgnoradas', relatorio.linhasIgnoradas),
    campoJson('totalLinhasInvalidas', relatorio.totalLinhasInvalidas),
    campoJson('porOperacao', porOperacao),
    listaJson('empregados', relatorio.empregados, empregadoJson),
    listaJson('ajustesRelogio', relatorio.ajustesRelogio, ajusteJson),
    listaJson('eventosRep', relatorio.eventosRep, eventoJson),
    listaJson('marcacoes', relatorio.marcacoes, marcacaoJson),
    listaJson('linhasInvalidas', relatorio.linhasInvalidas, (linha) => linha),
  ]
  const destino = new MontadorDeBlob()
  destino.adicionar('{\n')
  campos.forEach((campo, i) => {
    if (i > 0) destino.adicionar(',\n')
    campo(destino)
  })
  destino.adicionar('\n}\n')
  return destino.montar('application/json')
}

// ---------------------------------------------------------------------------
// CSV
// ---------------------------------------------------------------------------

// Separador `;` e BOM UTF-8: é o que o Excel em português abre direto, com
// acentos, sem passar pelo assistente de importação.
const SEPARADOR = ';'
const BOM = '﻿'

/**
 * Escapa um campo do CSV. Texto que começa com `=`, `+`, `-`, `@`, tab ou CR
 * ganha um apóstrofo, para o Excel não o executar como fórmula (o nome vem
 * do arquivo, que pode ter sido montado por qualquer um).
 */
export function campoCsv(valor: string): string {
  const seguro = /^[=+\-@\t\r]/.test(valor) ? `'${valor}` : valor
  return /[";\r\n]/.test(seguro) ? `"${seguro.replace(/"/g, '""')}"` : seguro
}

const linhaCsv = (campos: readonly string[]) => campos.map(campoCsv).join(SEPARADOR) + '\r\n'

interface ColunaCsv<R> {
  titulo: string
  valor: (registro: R) => string
}

const colunasEmpregados: ColunaCsv<RegistroTipo5>[] = [
  { titulo: 'Data', valor: (r) => formatarData(r.dataHora.data) },
  { titulo: 'Hora', valor: (r) => formatarHora(r.dataHora) },
  { titulo: 'Operação', valor: (r) => DESCRICOES_OPERACOES[r.operacao] },
  { titulo: 'CPF/PIS', valor: (r) => r.cpfPis },
  { titulo: 'Colaborador', valor: (r) => r.nome },
]

const colunasAjustes: ColunaCsv<RegistroTipo4>[] = [
  { titulo: 'Data antes', valor: (r) => formatarData(r.antes.data) },
  { titulo: 'Hora antes', valor: (r) => formatarHora(r.antes) },
  { titulo: 'Data depois', valor: (r) => formatarData(r.depois.data) },
  { titulo: 'Hora depois', valor: (r) => formatarHora(r.depois) },
  { titulo: 'CPF do responsável', valor: (r) => r.cpfResponsavel ?? '' },
]

const colunasEventos: ColunaCsv<RegistroTipo6>[] = [
  { titulo: 'Data', valor: (r) => formatarData(r.dataHora.data) },
  { titulo: 'Hora', valor: (r) => formatarHora(r.dataHora) },
  { titulo: 'Código', valor: (r) => r.codigo },
  { titulo: 'Descrição', valor: (r) => r.descricao },
]

const colunasMarcacoes: ColunaCsv<Marcacao>[] = [
  { titulo: 'Data', valor: (r) => formatarData(r.dataHora.data) },
  { titulo: 'Hora', valor: (r) => formatarHora(r.dataHora) },
  { titulo: 'NSR', valor: (r) => r.nsr },
  { titulo: 'CPF/PIS', valor: (r) => r.cpfPis },
  { titulo: 'Colaborador', valor: (r) => r.nome },
]

// Colunas do REP-P (Tipo 7); vazias nas marcações do Tipo 3.
const colunasRepP: ColunaCsv<Marcacao>[] = [
  {
    titulo: 'Coletor',
    valor: (r) => (r.tipo === '7' ? (DESCRICOES_COLETORES[r.coletor] ?? r.coletor) : ''),
  },
  {
    titulo: 'On-line/Off-line',
    valor: (r) => (r.tipo !== '7' || r.offline === null ? '' : r.offline ? 'Off-line' : 'On-line'),
  },
]

function csv<R>(colunas: readonly ColunaCsv<R>[], registros: readonly R[]): Blob {
  const destino = new MontadorDeBlob()
  destino.adicionar(BOM + linhaCsv(colunas.map((coluna) => coluna.titulo)))
  for (const registro of registros) destino.adicionar(linhaCsv(colunas.map((coluna) => coluna.valor(registro))))
  return destino.montar('text/csv;charset=utf-8')
}

// O worker só guarda registros da aba pedida em cada conjunto, então o filtro
// de tipo aqui só estreita o tipo para o TypeScript.
const ehDoTipo =
  <R extends RegistroConsultavel>(...tipos: R['tipo'][]) =>
  (registro: RegistroConsultavel): registro is R =>
    tipos.some((tipo) => tipo === registro.tipo)

/**
 * CSV de uma aba com os registros já filtrados e ordenados. As colunas do
 * REP-P só entram quando o arquivo tem Tipo 7, como na tela.
 */
export function montarCsvAfd(aba: AbaAfd, registros: readonly RegistroConsultavel[], comRepP: boolean): Blob {
  switch (aba) {
    case 'empregados':
      return csv(colunasEmpregados, registros.filter(ehDoTipo<RegistroTipo5>('5')))
    case 'ajustesRelogio':
      return csv(colunasAjustes, registros.filter(ehDoTipo<RegistroTipo4>('4')))
    case 'eventosRep':
      return csv(colunasEventos, registros.filter(ehDoTipo<RegistroTipo6>('6')))
    case 'marcacoes':
      return csv(
        comRepP ? [...colunasMarcacoes, ...colunasRepP] : colunasMarcacoes,
        registros.filter(ehDoTipo<Marcacao>('3', '7')),
      )
  }
}

// ---------------------------------------------------------------------------
// Pedido do worker
// ---------------------------------------------------------------------------

const NOME_ABA: Record<AbaAfd, string> = {
  empregados: 'funcionarios',
  ajustesRelogio: 'ajustes_relogio',
  eventosRep: 'eventos_rep',
  marcacoes: 'marcacoes',
}

/** `auditoria_afd_<timestamp>.json`, como na 3.8; o CSV leva o nome da aba. */
export function nomeArquivoExportacao(pedido: PedidoExportacaoAfd, agora: Date): string {
  const carimbo = agora.getTime()
  return pedido.formato === 'json'
    ? `auditoria_afd_${carimbo}.json`
    : `afd_${NOME_ABA[pedido.criterio.aba]}_${carimbo}.csv`
}

export function exportarAfd(
  relatorio: RelatorioAfd,
  consultor: ConsultorAfd,
  pedido: PedidoExportacaoAfd,
  agora: Date,
): ArquivoExportadoAfd {
  const arquivo =
    pedido.formato === 'json'
      ? montarJsonAfd(relatorio)
      : montarCsvAfd(
          pedido.criterio.aba,
          consultor.filtrar(pedido.criterio),
          relatorio.contagemPorTipo['7'] > 0,
        )
  return { arquivo, nomeArquivo: nomeArquivoExportacao(pedido, agora) }
}
