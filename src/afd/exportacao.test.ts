// @vitest-environment node
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { criarConsultorAfd } from './consulta'
import { MontadorDeBlob, campoCsv, exportarAfd, montarCsvAfd, montarJsonAfd, nomeArquivoExportacao } from './exportacao'
import { decodificarAfd, parsearAfd } from './parser'
import type { RelatorioAfd } from './tipos'

function lerFixture(nome: string): RelatorioAfd {
  const bytes = readFileSync(fileURLToPath(new URL(`./__fixtures__/${nome}`, import.meta.url)))
  return parsearAfd(decodificarAfd(bytes))
}

const afd671 = lerFixture('afd-671.txt')
const afd1510 = lerFixture('afd-1510.txt')

async function lerJson(blob: Blob): Promise<Record<string, unknown>> {
  const valor: unknown = JSON.parse(await blob.text())
  if (typeof valor !== 'object' || valor === null) throw new Error('JSON não é objeto')
  return { ...valor }
}

/** Linhas do CSV, sem o BOM e sem a quebra final. */
async function lerCsv(blob: Blob): Promise<string[][]> {
  const texto = await blob.text()
  return texto
    .replace(/^﻿/, '')
    .replace(/\r\n$/, '')
    .split('\r\n')
    .map((linha) => linha.split(';'))
}

describe('MontadorDeBlob', () => {
  it('deve juntar pedaços pequenos em blocos sem perder nem reordenar conteúdo', async () => {
    const montador = new MontadorDeBlob(10)
    for (const pedaco of ['abc', 'def', 'ghij', 'kl', 'mnopqrstuv', 'w']) montador.adicionar(pedaco)

    expect(montador.totalBlocos).toBe(3)
    await expect(montador.montar('text/plain').text()).resolves.toBe('abcdefghijklmnopqrstuvw')
  })

  it('deve montar um Blob vazio sem pedaços', async () => {
    const blob = new MontadorDeBlob().montar('text/plain')

    expect(blob.size).toBe(0)
    expect(blob.type).toBe('text/plain')
  })
})

describe('montarJsonAfd', () => {
  it('deve gerar JSON válido do tipo application/json', async () => {
    const blob = montarJsonAfd(afd671)

    expect(blob.type).toBe('application/json')
    await expect(lerJson(blob)).resolves.toBeTypeOf('object')
  })

  it('não deve duplicar o Tipo 5 em porData e porCPF', async () => {
    const json = await lerJson(montarJsonAfd(afd671))

    expect(json).not.toHaveProperty('porData')
    expect(json).not.toHaveProperty('porCPF')
    expect(json.empregados).toHaveLength(afd671.empregados.length)
  })

  it('deve manter os campos e a contagem por operação da 3.8', async () => {
    const json = await lerJson(montarJsonAfd(afd671))

    expect(json.porOperacao).toEqual({ Inclusão: 2, Alteração: 1, Exclusão: 1 })
    expect(json.empregados).toContainEqual({
      nsr: '000000002',
      dataHora: '2026-01-02',
      horaFormatada: '08:00:00',
      operacao: 'Inclusão',
      cpfPis: '012345678901',
      detalhes: 'JOÃO DA CONCEIÇÃO',
    })
    expect(json.eventosRep).toContainEqual({
      nsr: '000000011',
      dataHora: '2026-01-05 10:10:00',
      codigo: '07',
      descricao: 'Disponibilidade de serviço (somente REP-P)',
    })
  })

  it('deve gravar o ajuste com o CPF do responsável da 671 e null na 1510', async () => {
    const ajustes671 = (await lerJson(montarJsonAfd(afd671))).ajustesRelogio
    const ajustes1510 = (await lerJson(montarJsonAfd(afd1510))).ajustesRelogio

    expect(ajustes671).toEqual([
      {
        nsr: '000000009',
        dataAntes: '2026-01-05',
        horaAntes: '09:00:00',
        dataDepois: '2026-01-05',
        horaDepois: '09:05:00',
        cpfResponsavel: '99988877766',
      },
    ])
    expect(ajustes1510).toEqual([expect.objectContaining({ cpfResponsavel: null })])
  })

  it('deve acrescentar coletor e on/off-line só nas marcações do Tipo 7', async () => {
    const marcacoes = (await lerJson(montarJsonAfd(afd671))).marcacoes

    expect(marcacoes).toHaveLength(5)
    expect(marcacoes).toContainEqual(
      expect.objectContaining({ nsr: '000000013', tipo: '7', coletor: '01', offline: true }),
    )
    expect(marcacoes).toContainEqual({
      nsr: '000000005',
      dataHora: '2026-01-05',
      horaFormatada: '08:00:00',
      cpfPis: expect.any(String),
      nome: 'JOÃO DA CONCEIÇÃO',
    })
  })

  it('deve gerar listas vazias e portaria null para arquivo vazio', async () => {
    const json = await lerJson(montarJsonAfd(parsearAfd('')))

    expect(json).toMatchObject({ portaria: null, empregados: [], marcacoes: [], linhasInvalidas: [] })
  })

  it('deve incluir a amostra de linhas inválidas', async () => {
    const json = await lerJson(montarJsonAfd(afd671))

    expect(json.totalLinhasInvalidas).toBe(afd671.totalLinhasInvalidas)
    expect(json.linhasInvalidas).toEqual(afd671.linhasInvalidas)
  })
})

describe('campoCsv', () => {
  it('deve manter texto simples como está', () => {
    expect(campoCsv('JOÃO DA CONCEIÇÃO')).toBe('JOÃO DA CONCEIÇÃO')
  })

  it('deve pôr entre aspas e dobrar as aspas de campo com separador, aspas ou quebra', () => {
    expect(campoCsv('A;B')).toBe('"A;B"')
    expect(campoCsv('diz "oi"')).toBe('"diz ""oi"""')
    expect(campoCsv('a\nb')).toBe('"a\nb"')
  })

  it('deve neutralizar texto que o Excel executaria como fórmula', () => {
    expect(campoCsv('=HYPERLINK("x")')).toBe(`"'=HYPERLINK(""x"")"`)
    expect(campoCsv('+1')).toBe("'+1")
    expect(campoCsv('@SOMA')).toBe("'@SOMA")
  })
})

describe('montarCsvAfd', () => {
  const consultor = criarConsultorAfd(afd671)

  it('deve começar com BOM e usar ; e CRLF', async () => {
    const blob = montarCsvAfd('eventosRep', afd671.eventosRep, false)
    // `text()` descarta o BOM ao decodificar; ele precisa estar nos bytes.
    const bytes = new Uint8Array(await blob.arrayBuffer())
    const texto = await blob.text()

    expect(blob.type).toBe('text/csv;charset=utf-8')
    expect([...bytes.slice(0, 3)]).toEqual([0xef, 0xbb, 0xbf])
    expect(texto.startsWith('Data;Hora;Código;Descrição\r\n')).toBe(true)
    expect(texto.endsWith('\r\n')).toBe(true)
  })

  it('deve exportar funcionários com data formatada e a operação por extenso', async () => {
    const linhas = await lerCsv(montarCsvAfd('empregados', afd671.empregados, false))

    expect(linhas[0]).toEqual(['Data', 'Hora', 'Operação', 'CPF/PIS', 'Colaborador'])
    expect(linhas[1]).toEqual(['02/01/2026', '08:00', 'Inclusão', '012345678901', 'JOÃO DA CONCEIÇÃO'])
    expect(linhas).toHaveLength(1 + afd671.empregados.length)
  })

  it('deve deixar vazio o CPF do responsável que a 1510 não traz', async () => {
    const linhas = await lerCsv(montarCsvAfd('ajustesRelogio', afd1510.ajustesRelogio, false))

    expect(linhas[0]).toEqual(['Data antes', 'Hora antes', 'Data depois', 'Hora depois', 'CPF do responsável'])
    expect(linhas[1]).toEqual(['05/01/2026', '09:00', '05/01/2026', '09:05', ''])
  })

  it('deve incluir as colunas do REP-P só quando pedido', async () => {
    const semRepP = await lerCsv(montarCsvAfd('marcacoes', afd671.marcacoes, false))
    const comRepP = await lerCsv(montarCsvAfd('marcacoes', afd671.marcacoes, true))

    expect(semRepP[0]).toEqual(['Data', 'Hora', 'NSR', 'CPF/PIS', 'Colaborador'])
    expect(comRepP[0]).toEqual(['Data', 'Hora', 'NSR', 'CPF/PIS', 'Colaborador', 'Coletor', 'On-line/Off-line'])
    expect(comRepP[1].slice(5)).toEqual(['', ''])
    expect(comRepP[5]).toEqual(['06/01/2026', '08:00', '000000013', '98765432100', 'MARIA APARECIDA SOUZA', 'Aplicativo mobile', 'Off-line'])
  })

  it('deve respeitar filtros e ordem do conjunto recebido', async () => {
    const registros = consultor.filtrar({ aba: 'marcacoes', filtros: { nome: 'maria' }, ordem: 'data-decrescente' })

    const linhas = await lerCsv(montarCsvAfd('marcacoes', registros, false))

    expect(linhas.slice(1).map((linha) => linha[2])).toEqual(['000000013', '000000006'])
  })
})

describe('exportarAfd', () => {
  const consultor = criarConsultorAfd(afd671)
  const agora = new Date(1_760_000_000_000)

  it('deve nomear o JSON como na 3.8 e o CSV pela aba', () => {
    expect(nomeArquivoExportacao({ formato: 'json' }, agora)).toBe('auditoria_afd_1760000000000.json')
    expect(
      nomeArquivoExportacao({ formato: 'csv', criterio: { aba: 'ajustesRelogio', filtros: {}, ordem: 'arquivo' } }, agora),
    ).toBe('afd_ajustes_relogio_1760000000000.csv')
  })

  it('deve exportar o CSV filtrado da aba, sem paginação, com as colunas do REP-P do arquivo', async () => {
    const exportado = exportarAfd(
      afd671,
      consultor,
      { formato: 'csv', criterio: { aba: 'marcacoes', filtros: { data: '2026-01-05' }, ordem: 'arquivo' } },
      agora,
    )
    const linhas = await lerCsv(exportado.arquivo)

    expect(exportado.nomeArquivo).toBe('afd_marcacoes_1760000000000.csv')
    expect(linhas[0]).toContain('Coletor')
    expect(linhas.slice(1).map((linha) => linha[2])).toEqual(['000000005', '000000006', '000000007', '000000008'])
  })

  it('deve exportar o relatório inteiro em JSON', async () => {
    const exportado = exportarAfd(afd671, consultor, { formato: 'json' }, agora)

    expect(exportado.nomeArquivo).toBe('auditoria_afd_1760000000000.json')
    expect((await lerJson(exportado.arquivo)).marcacoes).toHaveLength(5)
  })
})
