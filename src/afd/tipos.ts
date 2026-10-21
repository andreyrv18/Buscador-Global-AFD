/**
 * Tipos de domínio do AFD (Arquivo Fonte de Dados).
 *
 * Portarias suportadas: 671/2021, 595/2013 e 1510/2009.
 * Posições de cada campo: PLANO-DE-ACAO.md, seção 1.2.
 */

/** Portaria cujo leiaute o arquivo segue. */
export type Portaria = '671' | '595' | '1510'

/**
 * Família de leiaute. A 595 e a 1510 compartilham o mesmo parser ("legado"):
 * a 595 só acrescenta campos no fim da linha e o registro Tipo 6.
 */
export type Leiaute = '671' | 'legado'

/** Caractere do tipo de registro (posição 010 do leiaute). */
export type TipoRegistro = '1' | '2' | '3' | '4' | '5' | '6' | '7' | '9'

/** Operação sobre o empregado no REP (Tipo 5). */
export type OperacaoEmpregado = 'I' | 'A' | 'E'

/** Data e hora de um registro, já normalizadas. */
export interface DataHoraAfd {
  /** `AAAA-MM-DD` */
  data: string
  /** `hh:mm:ss` (no legado os segundos são sempre `00`) */
  hora: string
  /** Fuso `-0300` na 671; `null` no legado, que não informa fuso. */
  fuso: string | null
}

interface RegistroBase {
  /** Número sequencial de registro, como aparece no arquivo (9 dígitos). */
  nsr: string
  /** Número da linha no arquivo, a partir de 1. */
  linha: number
  dataHora: DataHoraAfd
}

/** Tipo 3 — marcação de ponto. */
export interface RegistroTipo3 extends RegistroBase {
  tipo: '3'
  /** Identificador do empregado: CPF na 671, PIS no legado (sem espaços). */
  cpfPis: string
  /** Nome resolvido pelo Tipo 5, ou `NOME_DESCONHECIDO`. */
  nome: string
}

/** Tipo 4 — ajuste do relógio. */
export interface RegistroTipo4 extends RegistroBase {
  tipo: '4'
  /** Data/hora antes do ajuste (igual a `dataHora`). */
  antes: DataHoraAfd
  /** Data/hora ajustada. */
  depois: DataHoraAfd
  /** CPF de quem fez o ajuste. `null` quando o leiaute não traz (1510). */
  cpfResponsavel: string | null
}

/** Tipo 5 — inclusão, alteração ou exclusão de empregado no REP. */
export interface RegistroTipo5 extends RegistroBase {
  tipo: '5'
  operacao: OperacaoEmpregado
  /** Identificador do empregado: CPF na 671, PIS no legado (sem espaços). */
  cpfPis: string
  nome: string
  /** Campo "demais dados" (4 posições). `null` quando o leiaute não traz. */
  demaisDados: string | null
  /** CPF de quem fez a operação. Nunca identifica o empregado. */
  cpfResponsavel: string | null
}

/** Tipo 6 — evento sensível do REP (671 e 595). */
export interface RegistroTipo6 extends RegistroBase {
  tipo: '6'
  /** Código do evento, dois dígitos (`01` a `08`). */
  codigo: string
  descricao: string
}

/** Tipo 7 — marcação de ponto do REP-P (só 671). */
export interface RegistroTipo7 extends RegistroBase {
  tipo: '7'
  cpfPis: string
  nome: string
  /** Data/hora da gravação do registro. `null` se ausente ou ilegível. */
  dataHoraGravacao: DataHoraAfd | null
  /** Código do coletor (`01` a `05`); vazio se ausente. */
  coletor: string
  /** `true` se a marcação foi feita offline; `null` se o campo estiver ausente. */
  offline: boolean | null
  /** Hash SHA-256 do registro; vazio se ausente. */
  hash: string
}

/** Marcação de ponto, venha do Tipo 3 ou do Tipo 7. */
export type Marcacao = RegistroTipo3 | RegistroTipo7

/**
 * Tipo 1 — cabeçalho. Por ora só reconhecido; o parsing completo dos campos
 * está no backlog.
 */
export interface CabecalhoAfd {
  linha: number
  conteudo: string
}

/**
 * Trailer (NSR `999999999`). Por ora só reconhecido; a conferência das
 * contagens está no backlog.
 */
export interface TrailerAfd {
  linha: number
  conteudo: string
}

/** Linha com 9 primeiros dígitos numéricos que não pôde ser interpretada. */
export interface LinhaInvalida {
  /** Número da linha no arquivo, a partir de 1. */
  linha: number
  conteudo: string
  motivo: string
}

/** Resultado do processamento de um arquivo AFD. */
export interface RelatorioAfd {
  /** `null` quando o arquivo não tem nenhum registro dos tipos 3 a 7. */
  portaria: Portaria | null
  /**
   * `true` quando o arquivo traz registros da 671 e do legado (REP trocado ou
   * reconfigurado no meio do período). Cada registro é lido pelo seu leiaute.
   */
  leiauteMisto: boolean
  cabecalho: CabecalhoAfd | null
  trailer: TrailerAfd | null
  /** Tipos 3 e 7, na ordem do arquivo, com o nome já resolvido. */
  marcacoes: Marcacao[]
  ajustesRelogio: RegistroTipo4[]
  /** Registros Tipo 5, na ordem do arquivo. */
  empregados: RegistroTipo5[]
  eventosRep: RegistroTipo6[]
  /** Registros válidos por tipo (o trailer conta como `'9'`). */
  contagemPorTipo: Record<TipoRegistro, number>
  contagemOperacoes: Record<OperacaoEmpregado, number>
  /** Linhas não vazias lidas. */
  totalLinhas: number
  /** Linhas descartadas por não começarem com 9 dígitos (assinatura digital). */
  linhasIgnoradas: number
  totalLinhasInvalidas: number
  /** Amostra das linhas inválidas, limitada a `LIMITE_LINHAS_INVALIDAS`. */
  linhasInvalidas: LinhaInvalida[]
}

// ---------------------------------------------------------------------------
// Protocolo do worker
// ---------------------------------------------------------------------------

/** Pedido da interface ao worker. O token identifica o upload. */
export interface PedidoLeituraAfd {
  token: number
  arquivo: File
}

/** Mensagens do worker; todas carregam o token do pedido que as originou. */
export type RespostaWorkerAfd =
  | { token: number; tipo: 'progresso'; progresso: number }
  | { token: number; tipo: 'pronto'; relatorio: RelatorioAfd }
  | { token: number; tipo: 'erro'; mensagem: string }
