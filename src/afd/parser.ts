/**
 * Parser do AFD. TypeScript puro, sem React e sem efeito colateral.
 *
 * Índices 0-based: a posição `011-034` do leiaute vira `substring(10, 34)`.
 * Mapa completo em PLANO-DE-ACAO.md, seção 1.2.
 */
import {
  detectarLeiaute,
  ehLinhaDeRegistro,
  ehTrailer,
  indicaPortaria595,
} from './deteccao'
import type {
  CabecalhoAfd,
  DataHoraAfd,
  Leiaute,
  LinhaInvalida,
  Marcacao,
  OperacaoEmpregado,
  Portaria,
  RegistroTipo3,
  RegistroTipo4,
  RegistroTipo5,
  RegistroTipo6,
  RegistroTipo7,
  RelatorioAfd,
  TipoRegistro,
  TrailerAfd,
} from './tipos'

/** Nome exibido em marcação cujo identificador não aparece em nenhum Tipo 5. */
export const NOME_DESCONHECIDO = 'Desconhecido'

/** Quantas linhas inválidas são guardadas para exibição (todas são contadas). */
export const LIMITE_LINHAS_INVALIDAS = 1000

export const DESCRICOES_EVENTOS: Readonly<Record<string, string>> = {
  '01': 'Abertura do REP por manutenção ou violação (somente REP-C)',
  '02': 'Retorno de energia (REP-C ou REP-P)',
  '03': 'Introdução de dispositivo externo de memória na Porta Fiscal (somente REP-C)',
  '04': 'Retirada de dispositivo externo de memória na Porta Fiscal (somente REP-C)',
  '05': 'Emissão da Relação Instantânea de Marcações (somente REP-C)',
  '06': 'Erro de impressão (somente REP-C)',
  '07': 'Disponibilidade de serviço (somente REP-P)',
  '08': 'Indisponibilidade de serviço (somente REP-P)',
}

export const DESCRICAO_EVENTO_DESCONHECIDO = 'Evento não mapeado'

export const DESCRICOES_OPERACOES: Readonly<Record<OperacaoEmpregado, string>> = {
  I: 'Inclusão',
  A: 'Alteração',
  E: 'Exclusão',
}

export const DESCRICOES_COLETORES: Readonly<Record<string, string>> = {
  '01': 'Aplicativo mobile',
  '02': 'Browser (navegador internet)',
  '03': 'Aplicativo desktop',
  '04': 'Dispositivo eletrônico',
  '05': 'Outro dispositivo eletrônico não especificado',
}

/** Descrição do evento do Tipo 6 pelo código de dois dígitos. */
export function descreverEvento(codigo: string): string {
  return DESCRICOES_EVENTOS[codigo] ?? DESCRICAO_EVENTO_DESCONHECIDO
}

/**
 * Normaliza um documento (CPF ou PIS) para comparação: só dígitos, sem zeros
 * à esquerda. `'012.345.678-90'` e `'12345678901'` viram a mesma chave.
 */
export function normalizarDocumento(documento: string): string {
  return documento.replace(/\D/g, '').replace(/^0+/, '')
}

/** Decodifica os bytes do arquivo como ISO-8859-1, exigência do leiaute. */
export function decodificarAfd(bytes: ArrayBuffer | Uint8Array): string {
  return new TextDecoder('iso-8859-1').decode(bytes)
}

/** Separa o conteúdo em linhas, aceitando `\r\n`, `\n` e `\r`. */
export function dividirLinhas(conteudo: string): string[] {
  const linhas = conteudo.split(/\r\n|\n|\r/)
  if (linhas.length > 0 && linhas[linhas.length - 1] === '') linhas.pop()
  return linhas
}

// ---------------------------------------------------------------------------
// Leitura de campos
// ---------------------------------------------------------------------------

type Resultado<T> = { ok: true; valor: T } | { ok: false; motivo: string }

function sucesso<T>(valor: T): Resultado<T> {
  return { ok: true, valor }
}

function falha<T>(motivo: string): Resultado<T> {
  return { ok: false, motivo }
}

function dataValida(ano: string, mes: string, dia: string): boolean {
  const m = Number(mes)
  const d = Number(dia)
  return Number(ano) > 0 && m >= 1 && m <= 12 && d >= 1 && d <= 31
}

function horaValida(hora: string, minuto: string, segundo: string): boolean {
  return Number(hora) <= 23 && Number(minuto) <= 59 && Number(segundo) <= 59
}

const ISO_DATA_HORA = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})([+-]\d{4})$/

/** Data/hora ISO da 671 (`AAAA-MM-ddThh:mm:00ZZZZZ`, 24 posições) a partir de `inicio`. */
function lerDataHora671(linha: string, inicio: number): Resultado<DataHoraAfd> {
  const bruto = linha.substring(inicio, inicio + 24)
  const partes = ISO_DATA_HORA.exec(bruto)
  if (partes === null) return falha(`data/hora inválida: "${bruto}"`)
  const [, ano, mes, dia, hora, minuto, segundo, fuso] = partes
  if (!dataValida(ano, mes, dia) || !horaValida(hora, minuto, segundo)) {
    return falha(`data/hora inválida: "${bruto}"`)
  }
  return sucesso({
    data: `${ano}-${mes}-${dia}`,
    hora: `${hora}:${minuto}:${segundo}`,
    fuso,
  })
}

const LEGADO_DATA = /^(\d{2})(\d{2})(\d{4})$/
const LEGADO_HORA = /^(\d{2})(\d{2})$/

/** Data `ddmmaaaa` (8) seguida de hora `hhmm` (4) a partir de `inicio`. */
function lerDataHoraLegado(linha: string, inicio: number): Resultado<DataHoraAfd> {
  const brutoData = linha.substring(inicio, inicio + 8)
  const brutoHora = linha.substring(inicio + 8, inicio + 12)
  const data = LEGADO_DATA.exec(brutoData)
  const hora = LEGADO_HORA.exec(brutoHora)
  if (data === null || hora === null) {
    return falha(`data/hora inválida: "${brutoData}${brutoHora}"`)
  }
  const [, dia, mes, ano] = data
  const [, hh, mm] = hora
  if (!dataValida(ano, mes, dia) || !horaValida(hh, mm, '00')) {
    return falha(`data/hora inválida: "${brutoData}${brutoHora}"`)
  }
  return sucesso({ data: `${ano}-${mes}-${dia}`, hora: `${hh}:${mm}:00`, fuso: null })
}

function lerDataHora(leiaute: Leiaute, linha: string, inicio671: number, inicioLegado: number) {
  return leiaute === '671'
    ? lerDataHora671(linha, inicio671)
    : lerDataHoraLegado(linha, inicioLegado)
}

/** Identificador do empregado: precisa ter ao menos um dígito. */
function lerIdentificador(linha: string, inicio: number, fim: number): Resultado<string> {
  const valor = linha.substring(inicio, fim).trim()
  if (!/\d/.test(valor)) {
    return falha('identificador do empregado ausente')
  }
  return sucesso(valor)
}

/** Campo opcional do fim da linha: `null` se a linha não chega até ele. */
function campoOpcional(linha: string, inicio: number, fim: number): string | null {
  if (linha.length < fim) return null
  const valor = linha.substring(inicio, fim).trim()
  return valor === '' ? null : valor
}

function exigirComprimento(linha: string, minimo: number): Resultado<true> {
  return linha.length >= minimo
    ? sucesso(true)
    : falha(`linha curta: ${linha.length} posições, mínimo ${minimo}`)
}

// ---------------------------------------------------------------------------
// Parsing por tipo de registro
// ---------------------------------------------------------------------------

const COMPRIMENTO_MINIMO: Record<Leiaute, Record<'3' | '4' | '5' | '6' | '7', number>> = {
  '671': { '3': 46, '4': 58, '5': 47, '6': 36, '7': 46 },
  legado: { '3': 34, '4': 34, '5': 35, '6': 24, '7': Infinity },
}

function parsearTipo3(leiaute: Leiaute, linha: string, numero: number): Resultado<RegistroTipo3> {
  const dataHora = lerDataHora(leiaute, linha, 10, 10)
  if (!dataHora.ok) return dataHora
  const cpfPis = leiaute === '671' ? lerIdentificador(linha, 34, 46) : lerIdentificador(linha, 22, 34)
  if (!cpfPis.ok) return cpfPis
  return sucesso({
    tipo: '3',
    nsr: linha.substring(0, 9),
    linha: numero,
    dataHora: dataHora.valor,
    cpfPis: cpfPis.valor,
    nome: NOME_DESCONHECIDO,
  })
}

function parsearTipo4(leiaute: Leiaute, linha: string, numero: number): Resultado<RegistroTipo4> {
  const antes = lerDataHora(leiaute, linha, 10, 10)
  if (!antes.ok) return antes
  const depois = lerDataHora(leiaute, linha, 34, 22)
  if (!depois.ok) return depois
  const cpfResponsavel =
    leiaute === '671' ? campoOpcional(linha, 58, 69) : campoOpcional(linha, 34, 45)
  return sucesso({
    tipo: '4',
    nsr: linha.substring(0, 9),
    linha: numero,
    dataHora: antes.valor,
    antes: antes.valor,
    depois: depois.valor,
    cpfResponsavel,
  })
}

function ehOperacao(caractere: string): caractere is OperacaoEmpregado {
  return caractere === 'I' || caractere === 'A' || caractere === 'E'
}

function parsearTipo5(leiaute: Leiaute, linha: string, numero: number): Resultado<RegistroTipo5> {
  const dataHora = lerDataHora(leiaute, linha, 10, 10)
  if (!dataHora.ok) return dataHora
  const e671 = leiaute === '671'
  const operacao = linha.charAt(e671 ? 34 : 22)
  if (!ehOperacao(operacao)) return falha(`operação inválida: "${operacao}"`)
  const cpfPis = e671 ? lerIdentificador(linha, 35, 47) : lerIdentificador(linha, 23, 35)
  if (!cpfPis.ok) return cpfPis
  return sucesso({
    tipo: '5',
    nsr: linha.substring(0, 9),
    linha: numero,
    dataHora: dataHora.valor,
    operacao,
    cpfPis: cpfPis.valor,
    nome: (e671 ? linha.substring(47, 99) : linha.substring(35, 87)).trim(),
    demaisDados: e671 ? campoOpcional(linha, 99, 103) : campoOpcional(linha, 87, 91),
    cpfResponsavel: e671 ? campoOpcional(linha, 103, 114) : campoOpcional(linha, 91, 102),
  })
}

function parsearTipo6(leiaute: Leiaute, linha: string, numero: number): Resultado<RegistroTipo6> {
  const dataHora = lerDataHora(leiaute, linha, 10, 10)
  if (!dataHora.ok) return dataHora
  const codigo = leiaute === '671' ? linha.substring(34, 36) : linha.substring(22, 24)
  if (!/^\d{2}$/.test(codigo)) return falha(`código de evento inválido: "${codigo}"`)
  return sucesso({
    tipo: '6',
    nsr: linha.substring(0, 9),
    linha: numero,
    dataHora: dataHora.valor,
    codigo,
    descricao: descreverEvento(codigo),
  })
}

function parsearTipo7(linha: string, numero: number): Resultado<RegistroTipo7> {
  const dataHora = lerDataHora671(linha, 10)
  if (!dataHora.ok) return dataHora
  const cpfPis = lerIdentificador(linha, 34, 46)
  if (!cpfPis.ok) return cpfPis
  const gravacao = linha.length >= 70 ? lerDataHora671(linha, 46) : null
  const onOff = linha.charAt(72)
  return sucesso({
    tipo: '7',
    nsr: linha.substring(0, 9),
    linha: numero,
    dataHora: dataHora.valor,
    cpfPis: cpfPis.valor,
    nome: NOME_DESCONHECIDO,
    dataHoraGravacao: gravacao !== null && gravacao.ok ? gravacao.valor : null,
    coletor: linha.substring(70, 72).trim(),
    offline: onOff === '1' ? true : onOff === '0' ? false : null,
    hash: linha.substring(73, 137).trim(),
  })
}

type RegistroDeDados = RegistroTipo3 | RegistroTipo4 | RegistroTipo5 | RegistroTipo6 | RegistroTipo7

function parsearRegistro(
  leiaute: Leiaute,
  tipo: '3' | '4' | '5' | '6' | '7',
  linha: string,
  numero: number,
): Resultado<RegistroDeDados> {
  if (tipo === '7' && leiaute === 'legado') {
    return falha('registro Tipo 7 não existe no leiaute legado (595/1510)')
  }
  const comprimento = exigirComprimento(linha, COMPRIMENTO_MINIMO[leiaute][tipo])
  if (!comprimento.ok) return comprimento
  switch (tipo) {
    case '3':
      return parsearTipo3(leiaute, linha, numero)
    case '4':
      return parsearTipo4(leiaute, linha, numero)
    case '5':
      return parsearTipo5(leiaute, linha, numero)
    case '6':
      return parsearTipo6(leiaute, linha, numero)
    case '7':
      return parsearTipo7(linha, numero)
  }
}

// ---------------------------------------------------------------------------
// Parser incremental
// ---------------------------------------------------------------------------

export interface ParserAfd {
  /** Processa uma linha (sem o terminador; um `\r` final é tolerado). */
  processarLinha(linha: string): void
  /** Resolve os nomes das marcações e devolve o relatório. */
  finalizar(): RelatorioAfd
}

function ehTipoDeDados(tipo: string): tipo is '3' | '4' | '5' | '6' | '7' {
  return tipo === '3' || tipo === '4' || tipo === '5' || tipo === '6' || tipo === '7'
}

/**
 * Cria um parser que recebe as linhas uma a uma. Serve ao worker, que lê o
 * arquivo em chunks: nenhuma linha precisa ficar em memória depois de lida.
 */
export function criarParserAfd(): ParserAfd {
  let numeroLinha = 0
  let leiaute: Leiaute | null = null
  let indicio595 = false
  let leiauteMisto = false
  let cabecalho: CabecalhoAfd | null = null
  let trailer: TrailerAfd | null = null
  const marcacoes: Marcacao[] = []
  const ajustesRelogio: RegistroTipo4[] = []
  const empregados: RegistroTipo5[] = []
  const eventosRep: RegistroTipo6[] = []
  const contagemPorTipo: Record<TipoRegistro, number> = {
    '1': 0, '2': 0, '3': 0, '4': 0, '5': 0, '6': 0, '7': 0, '9': 0,
  }
  const contagemOperacoes: Record<OperacaoEmpregado, number> = { I: 0, A: 0, E: 0 }
  let totalLinhas = 0
  let linhasIgnoradas = 0
  let totalLinhasInvalidas = 0
  const linhasInvalidas: LinhaInvalida[] = []

  function registrarInvalida(linha: string, motivo: string): void {
    totalLinhasInvalidas++
    if (linhasInvalidas.length < LIMITE_LINHAS_INVALIDAS) {
      linhasInvalidas.push({ linha: numeroLinha, conteudo: linha, motivo })
    }
  }

  function guardar(registro: RegistroDeDados): void {
    contagemPorTipo[registro.tipo]++
    switch (registro.tipo) {
      case '3':
      case '7':
        marcacoes.push(registro)
        break
      case '4':
        ajustesRelogio.push(registro)
        break
      case '5':
        empregados.push(registro)
        contagemOperacoes[registro.operacao]++
        break
      case '6':
        eventosRep.push(registro)
        break
    }
  }

  function processarLinha(bruta: string): void {
    numeroLinha++
    const linha = bruta.endsWith('\r') ? bruta.slice(0, -1) : bruta
    if (linha.trim() === '') return
    totalLinhas++

    if (!ehLinhaDeRegistro(linha)) {
      linhasIgnoradas++
      return
    }
    if (ehTrailer(linha)) {
      contagemPorTipo['9']++
      trailer = { linha: numeroLinha, conteudo: linha }
      return
    }

    const tipo = linha.charAt(9)
    if (tipo === '1') {
      contagemPorTipo['1']++
      cabecalho = { linha: numeroLinha, conteudo: linha }
      return
    }
    if (tipo === '2') {
      contagemPorTipo['2']++
      return
    }
    if (!ehTipoDeDados(tipo)) {
      registrarInvalida(linha, `tipo de registro desconhecido: "${tipo}"`)
      return
    }

    // Cada registro é lido pelo seu próprio leiaute: há REP que gravou parte
    // do arquivo na 671 e parte no legado. A portaria do arquivo é a do
    // primeiro registro válido dos tipos 3 a 7.
    const leiauteDaLinha = detectarLeiaute(linha)
    const resultado = parsearRegistro(leiauteDaLinha, tipo, linha, numeroLinha)
    if (!resultado.ok) {
      registrarInvalida(linha, resultado.motivo)
      return
    }
    if (leiaute === null) leiaute = leiauteDaLinha
    else if (leiaute !== leiauteDaLinha) leiauteMisto = true
    if (leiauteDaLinha === 'legado' && indicaPortaria595(linha)) indicio595 = true
    guardar(resultado.valor)
  }

  function finalizar(): RelatorioAfd {
    // Só o identificador do empregado do Tipo 5 alimenta o dicionário.
    const nomes = new Map<string, string>()
    for (const empregado of empregados) {
      const chave = normalizarDocumento(empregado.cpfPis)
      if (chave !== '' && empregado.nome !== '') nomes.set(chave, empregado.nome)
    }
    for (const marcacao of marcacoes) {
      marcacao.nome = nomes.get(normalizarDocumento(marcacao.cpfPis)) ?? NOME_DESCONHECIDO
    }

    let portaria: Portaria | null = null
    if (leiaute === '671') portaria = '671'
    else if (leiaute === 'legado') portaria = indicio595 ? '595' : '1510'

    return {
      portaria,
      leiauteMisto,
      cabecalho,
      trailer,
      marcacoes,
      ajustesRelogio,
      empregados,
      eventosRep,
      contagemPorTipo,
      contagemOperacoes,
      totalLinhas,
      linhasIgnoradas,
      totalLinhasInvalidas,
      linhasInvalidas,
    }
  }

  return { processarLinha, finalizar }
}

/** Processa um AFD inteiro já decodificado (texto ou lista de linhas). */
export function parsearAfd(entrada: string | Iterable<string>): RelatorioAfd {
  const linhas = typeof entrada === 'string' ? dividirLinhas(entrada) : entrada
  const parser = criarParserAfd()
  for (const linha of linhas) parser.processarLinha(linha)
  return parser.finalizar()
}
