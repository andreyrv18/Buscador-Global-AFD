// @vitest-environment node
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import {
  DESCRICAO_EVENTO_DESCONHECIDO,
  LIMITE_LINHAS_INVALIDAS,
  NOME_DESCONHECIDO,
  criarParserAfd,
  decodificarAfd,
  descreverEvento,
  dividirLinhas,
  normalizarDocumento,
  parsearAfd,
} from './parser'
import type { RelatorioAfd } from './tipos'

function lerBytes(nome: string): Uint8Array {
  return readFileSync(fileURLToPath(new URL(`./__fixtures__/${nome}`, import.meta.url)))
}

function lerFixture(nome: string): RelatorioAfd {
  return parsearAfd(decodificarAfd(lerBytes(nome)))
}

const JOAO = 'JOÃO DA CONCEIÇÃO'

const afd671 = lerFixture('afd-671.txt')
const afd595 = lerFixture('afd-595.txt')
const afd1510 = lerFixture('afd-1510.txt')

function nomeDaMarcacao(relatorio: RelatorioAfd, cpfPis: string): string | undefined {
  return relatorio.marcacoes.find((m) => m.cpfPis === cpfPis)?.nome
}

describe('decodificarAfd', () => {
  it('deve preservar acento em nome com Ç e Ã (ISO-8859-1)', () => {
    const bytes = lerBytes('afd-671.txt')
    // Ç (0xC7) gravado em um byte só: o arquivo não é UTF-8
    expect(bytes.includes(0xc7)).toBe(true)
    expect(decodificarAfd(bytes)).toContain(JOAO)
    expect(afd671.empregados[0].nome).toBe(JOAO)
  })

  it('deve aceitar ArrayBuffer', () => {
    const bytes = new Uint8Array([0x4a, 0x4f, 0xc3, 0x4f])
    expect(decodificarAfd(bytes.buffer)).toBe('JOÃO')
  })
})

describe('dividirLinhas', () => {
  it('deve aceitar CRLF, LF e CR e descartar a quebra final', () => {
    expect(dividirLinhas('a\r\nb\nc\rd\n')).toEqual(['a', 'b', 'c', 'd'])
  })
})

describe('normalizarDocumento', () => {
  it('deve manter só dígitos e remover zeros à esquerda', () => {
    expect(normalizarDocumento(' 012.345.678-90 ')).toBe('1234567890')
  })
})

describe('descreverEvento', () => {
  it('deve descrever os eventos 07 e 08 do REP-P', () => {
    expect(descreverEvento('07')).toBe('Disponibilidade de serviço (somente REP-P)')
    expect(descreverEvento('08')).toBe('Indisponibilidade de serviço (somente REP-P)')
  })

  it('deve sinalizar código não mapeado', () => {
    expect(descreverEvento('99')).toBe(DESCRICAO_EVENTO_DESCONHECIDO)
  })
})

describe('Portaria 671', () => {
  it('deve detectar a portaria 671', () => {
    expect(afd671.portaria).toBe('671')
  })

  it('deve reconhecer cabeçalho, Tipo 2 e trailer sem contá-los como inválidos', () => {
    expect(afd671.cabecalho?.linha).toBe(1)
    expect(afd671.trailer?.conteudo.startsWith('999999999')).toBe(true)
    expect(afd671.contagemPorTipo).toEqual({
      '1': 1, '2': 1, '3': 4, '4': 1, '5': 4, '6': 3, '7': 1, '9': 1,
    })
  })

  it('deve reconhecer o Tipo 4 e ler o CPF do responsável', () => {
    expect(afd671.ajustesRelogio).toHaveLength(1)
    const [ajuste] = afd671.ajustesRelogio
    expect(ajuste.antes).toEqual({ data: '2026-01-05', hora: '09:00:00', fuso: '-0300' })
    expect(ajuste.depois).toEqual({ data: '2026-01-05', hora: '09:05:00', fuso: '-0300' })
    expect(ajuste.cpfResponsavel).toBe('99988877766')
  })

  it('deve ler CPF de 12 posições com zero à esquerda sem cortar dígito nem invadir o nome', () => {
    const [joao] = afd671.empregados
    expect(joao.cpfPis).toBe('012345678901')
    expect(joao.nome).toBe(JOAO)
    expect(joao.operacao).toBe('I')
    expect(joao.demaisDados).toBe('0000')
    expect(joao.cpfResponsavel).toBe('99988877766')
  })

  it('deve casar marcação e Tipo 5 ignorando zeros à esquerda', () => {
    expect(nomeDaMarcacao(afd671, '12345678901')).toBe(JOAO)
  })

  it('deve usar o nome mais recente do empregado alterado', () => {
    expect(nomeDaMarcacao(afd671, '98765432100')).toBe('MARIA APARECIDA SOUZA')
  })

  it('não deve transformar o CPF do responsável em nome de empregado', () => {
    expect(nomeDaMarcacao(afd671, '99988877766')).toBe(NOME_DESCONHECIDO)
  })

  it('deve marcar como Desconhecido a marcação sem Tipo 5 correspondente', () => {
    expect(nomeDaMarcacao(afd671, '55566677788')).toBe(NOME_DESCONHECIDO)
  })

  it('deve contar as operações do Tipo 5', () => {
    expect(afd671.contagemOperacoes).toEqual({ I: 2, A: 1, E: 1 })
  })

  it('deve descrever os eventos 07 e 08', () => {
    expect(afd671.eventosRep.map((e) => [e.codigo, e.descricao])).toEqual([
      ['02', 'Retorno de energia (REP-C ou REP-P)'],
      ['07', 'Disponibilidade de serviço (somente REP-P)'],
      ['08', 'Indisponibilidade de serviço (somente REP-P)'],
    ])
  })

  it('deve ler a marcação Tipo 7 do REP-P', () => {
    const tipo7 = afd671.marcacoes.find((m) => m.tipo === '7')
    expect(tipo7).toEqual({
      tipo: '7',
      nsr: '000000013',
      linha: 14,
      dataHora: { data: '2026-01-06', hora: '08:00:00', fuso: '-0300' },
      cpfPis: '98765432100',
      nome: 'MARIA APARECIDA SOUZA',
      dataHoraGravacao: { data: '2026-01-06', hora: '08:00:05', fuso: '-0300' },
      coletor: '01',
      offline: true,
      hash: 'a3f1'.repeat(16),
    })
  })

  it('deve ignorar a linha de assinatura digital', () => {
    expect(afd671.linhasIgnoradas).toBe(1)
    expect(afd671.linhasInvalidas.some((l) => l.conteudo.startsWith('MEUC'))).toBe(false)
  })

  it('deve contar as linhas inválidas com o motivo', () => {
    expect(afd671.totalLinhasInvalidas).toBe(3)
    expect(afd671.linhasInvalidas.map((l) => l.linha)).toEqual([16, 17, 18])
    expect(afd671.linhasInvalidas[0].motivo).toContain('tipo de registro desconhecido')
    expect(afd671.linhasInvalidas[1].motivo).toContain('linha curta')
    expect(afd671.linhasInvalidas[2].motivo).toContain('data/hora inválida')
  })

  it('deve contar o total de linhas não vazias', () => {
    expect(afd671.totalLinhas).toBe(20)
  })

  it('não deve sinalizar leiaute misto em arquivo homogêneo', () => {
    expect([afd671.leiauteMisto, afd595.leiauteMisto, afd1510.leiauteMisto]).toEqual([false, false, false])
  })
})

describe('arquivo com leiaute misto', () => {
  const misto = parsearAfd([
    '000000001' + '3' + '2025-05-14T11:50:00-0300' + '12345678901 ' + 'ABCD',
    '000000002' + '5' + '23012020' + '1621' + 'I' + '012345678901' + 'JOSÉ DA SILVA'.padEnd(52, ' '),
    '000000003' + '3' + '23012020' + '1622' + '012345678901',
  ])

  it('deve ler cada registro pelo seu próprio leiaute', () => {
    expect(misto.totalLinhasInvalidas).toBe(0)
    expect(misto.marcacoes.map((m) => [m.dataHora.data, m.nome])).toEqual([
      ['2025-05-14', 'JOSÉ DA SILVA'],
      ['2020-01-23', 'JOSÉ DA SILVA'],
    ])
  })

  it('deve rotular pela portaria do primeiro registro e sinalizar a mistura', () => {
    expect(misto.portaria).toBe('671')
    expect(misto.leiauteMisto).toBe(true)
  })
})

describe('Portaria 595', () => {
  it('deve detectar a portaria 595', () => {
    expect(afd595.portaria).toBe('595')
  })

  it('deve converter data e hora legadas para o formato ISO', () => {
    expect(afd595.marcacoes[0].dataHora).toEqual({ data: '2026-01-05', hora: '08:00:00', fuso: null })
  })

  it('deve preservar acento em nome com Ç e Ã', () => {
    expect(afd595.empregados[0].nome).toBe(JOAO)
  })

  it('deve ler PIS de 12 posições com zero à esquerda sem invadir o nome', () => {
    const [joao] = afd595.empregados
    expect(joao.cpfPis).toBe('012345678901')
    expect(joao.demaisDados).toBe('0000')
    expect(joao.cpfResponsavel).toBe('99988877766')
    expect(nomeDaMarcacao(afd595, '012345678901')).toBe(JOAO)
  })

  it('deve reconhecer o Tipo 4 e ler o CPF do responsável', () => {
    const [ajuste] = afd595.ajustesRelogio
    expect(ajuste.antes).toEqual({ data: '2026-01-05', hora: '09:00:00', fuso: null })
    expect(ajuste.depois).toEqual({ data: '2026-01-05', hora: '09:05:00', fuso: null })
    expect(ajuste.cpfResponsavel).toBe('99988877766')
  })

  it('não deve transformar o CPF do responsável em nome de empregado', () => {
    expect(nomeDaMarcacao(afd595, '099988877766')).toBe(NOME_DESCONHECIDO)
  })

  it('deve marcar como Desconhecido a marcação sem Tipo 5 correspondente', () => {
    expect(nomeDaMarcacao(afd595, '055566677788')).toBe(NOME_DESCONHECIDO)
  })

  it('deve descrever os eventos 07 e 08', () => {
    expect(afd595.eventosRep.map((e) => e.codigo)).toEqual(['02', '07', '08'])
    expect(afd595.eventosRep[1].descricao).toBe('Disponibilidade de serviço (somente REP-P)')
    expect(afd595.eventosRep[2].descricao).toBe('Indisponibilidade de serviço (somente REP-P)')
  })

  it('deve ignorar a linha de assinatura digital', () => {
    expect(afd595.linhasIgnoradas).toBe(1)
  })

  it('deve contar as linhas inválidas, incluindo operação desconhecida no Tipo 5', () => {
    expect(afd595.totalLinhasInvalidas).toBe(3)
    expect(afd595.linhasInvalidas[2].motivo).toBe('operação inválida: "X"')
    expect(afd595.empregados).toHaveLength(2)
  })
})

describe('Portaria 1510', () => {
  it('deve detectar a portaria 1510', () => {
    expect(afd1510.portaria).toBe('1510')
  })

  it('deve ler o Tipo 4 sem CPF do responsável', () => {
    const [ajuste] = afd1510.ajustesRelogio
    expect(ajuste.depois).toEqual({ data: '2026-01-05', hora: '09:05:00', fuso: null })
    expect(ajuste.cpfResponsavel).toBeNull()
  })

  it('deve ler o Tipo 5 sem demais dados nem CPF do responsável', () => {
    const [joao] = afd1510.empregados
    expect(joao.nome).toBe(JOAO)
    expect(joao.cpfPis).toBe('012345678901')
    expect(joao.demaisDados).toBeNull()
    expect(joao.cpfResponsavel).toBeNull()
  })

  it('deve resolver o nome das marcações pelo PIS', () => {
    expect(afd1510.marcacoes.map((m) => m.nome)).toEqual([
      JOAO,
      'MARIA APARECIDA SILVA',
      NOME_DESCONHECIDO,
    ])
  })

  it('deve tratar Tipo 7 como inválido no leiaute legado', () => {
    expect(afd1510.totalLinhasInvalidas).toBe(2)
    expect(afd1510.linhasInvalidas[0].motivo).toContain('Tipo 7')
  })

  it('deve ignorar a linha de assinatura digital', () => {
    expect(afd1510.linhasIgnoradas).toBe(1)
    expect(afd1510.eventosRep).toHaveLength(0)
  })
})

describe('parsearAfd', () => {
  const marcacao671 = (dataHora: string, cpf: string) =>
    '000000005' + '3' + dataHora + cpf.padEnd(12, ' ') + 'ABCD'

  it('deve retornar portaria null quando não há registro de dados', () => {
    const relatorio = parsearAfd(['000000000' + '1' + '1', '999999999000000000'])
    expect(relatorio.portaria).toBeNull()
    expect(relatorio.totalLinhasInvalidas).toBe(0)
  })

  it('deve aceitar lista de linhas e tolerar \\r no fim', () => {
    const relatorio = parsearAfd([marcacao671('2026-01-05T08:00:00-0300', '123') + '\r', '', '   '])
    expect(relatorio.marcacoes[0].cpfPis).toBe('123')
    expect(relatorio.totalLinhas).toBe(1)
  })

  it('deve recusar marcação sem identificador do empregado', () => {
    const relatorio = parsearAfd([marcacao671('2026-01-05T08:00:00-0300', '')])
    expect(relatorio.linhasInvalidas[0].motivo).toBe('identificador do empregado ausente')
  })

  it('deve recusar hora fora do intervalo', () => {
    const relatorio = parsearAfd([marcacao671('2026-01-05T25:00:00-0300', '123')])
    expect(relatorio.linhasInvalidas[0].motivo).toContain('data/hora inválida')
  })

  it('deve recusar data legada fora do intervalo e formato não numérico', () => {
    const relatorio = parsearAfd([
      '000000001' + '3' + '32012026' + '0800' + '012345678901',
      '000000002' + '3' + '05012026' + '08AB' + '012345678901',
    ])
    expect(relatorio.totalLinhasInvalidas).toBe(2)
    // a portaria vem do primeiro registro válido; aqui não há nenhum
    expect(relatorio.portaria).toBeNull()
  })

  it('deve recusar a data ajustada inválida no Tipo 4', () => {
    const relatorio = parsearAfd([
      '000000001' + '4' + '2026-01-05T09:00:00-0300' + '2026-01-05X09:05:00-0300' + '99988877766',
    ])
    expect(relatorio.linhasInvalidas[0].motivo).toContain('data/hora inválida')
  })

  it('deve recusar Tipo 4, 5 e 6 com data/hora inválida', () => {
    const relatorio = parsearAfd([
      '000000001' + '4' + '2026-1X-05T09:00:00-0300'.padEnd(48, '0'),
      '000000002' + '5' + '2026-1X-05T09:00:00-0300' + 'I' + '012345678901',
      '000000003' + '6' + '2026-1X-05T09:00:00-0300' + '07',
    ])
    expect(relatorio.totalLinhasInvalidas).toBe(3)
  })

  it('deve recusar Tipo 5 sem identificador e Tipo 6 com código não numérico', () => {
    const relatorio = parsearAfd([
      '000000001' + '6' + '2026-01-05T09:00:00-0300' + 'XX',
      '000000002' + '5' + '2026-01-05T09:00:00-0300' + 'I' + '            ',
    ])
    expect(relatorio.linhasInvalidas.map((l) => l.motivo)).toEqual([
      'código de evento inválido: "XX"',
      'identificador do empregado ausente',
    ])
  })

  it('deve recusar Tipo 7 com data/hora ou CPF inválidos', () => {
    const relatorio = parsearAfd([
      '000000001' + '7' + '2026-1X-05T09:00:00-0300' + '123456789012',
      '000000002' + '7' + '2026-01-05T09:00:00-0300' + '            ',
    ])
    expect(relatorio.totalLinhasInvalidas).toBe(2)
  })

  it('deve aceitar Tipo 7 sem os campos finais', () => {
    const relatorio = parsearAfd(['000000001' + '7' + '2026-01-05T09:00:00-0300' + '123456789012'])
    expect(relatorio.marcacoes[0]).toMatchObject({
      dataHoraGravacao: null,
      coletor: '',
      offline: null,
      hash: '',
    })
  })

  it('deve ler Tipo 7 online com gravação ilegível', () => {
    const relatorio = parsearAfd([
      '000000001' + '7' + '2026-01-05T09:00:00-0300' + '123456789012' +
        'xxxx-01-05T09:00:00-0300' + '02' + '0',
    ])
    expect(relatorio.marcacoes[0]).toMatchObject({ dataHoraGravacao: null, offline: false })
  })

  it('deve guardar no máximo LIMITE_LINHAS_INVALIDAS linhas, mas contar todas', () => {
    const parser = criarParserAfd()
    const total = LIMITE_LINHAS_INVALIDAS + 5
    for (let i = 0; i < total; i++) parser.processarLinha('000000001X')
    const relatorio = parser.finalizar()
    expect(relatorio.totalLinhasInvalidas).toBe(total)
    expect(relatorio.linhasInvalidas).toHaveLength(LIMITE_LINHAS_INVALIDAS)
  })

  it('não deve alimentar o dicionário com Tipo 5 de nome vazio ou documento zerado', () => {
    const tipo5 = (cpf: string, nome: string) =>
      '000000001' + '5' + '2026-01-05T09:00:00-0300' + 'I' + cpf.padEnd(12, ' ') + nome.padEnd(52, ' ')
    const relatorio = parsearAfd([
      tipo5('123', ''),
      tipo5('000000000000', 'ZERADO'),
      marcacao671('2026-01-05T08:00:00-0300', '123'),
      marcacao671('2026-01-05T08:00:00-0300', '0'),
    ])
    expect(relatorio.marcacoes.map((m) => m.nome)).toEqual([NOME_DESCONHECIDO, NOME_DESCONHECIDO])
  })
})
