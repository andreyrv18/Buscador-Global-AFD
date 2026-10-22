// @vitest-environment node
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { criarConsultorAfd, normalizarTexto, resumirRelatorioAfd } from './consulta'
import { decodificarAfd, parsearAfd } from './parser'
import type { AbaAfd, ConsultaAfd, FiltrosAfd, OrdemAfd, RegistroConsultavel, RelatorioAfd } from './tipos'

function lerFixture(nome: string): RelatorioAfd {
  const bytes = readFileSync(fileURLToPath(new URL(`./__fixtures__/${nome}`, import.meta.url)))
  return parsearAfd(decodificarAfd(bytes))
}

function consulta(aba: AbaAfd, filtros: FiltrosAfd = {}, ordem: OrdemAfd = 'arquivo'): ConsultaAfd {
  return { aba, filtros, ordem, offset: 0, limite: 100 }
}

const nsrs = (itens: RegistroConsultavel[]) => itens.map((item) => Number(item.nsr))

// Marcações da fixture 671: NSR 5 (João), 6 (Maria), 7 e 8 (sem Tipo 5),
// todas em 05/01, e NSR 13 (Maria, Tipo 7) em 06/01.
const afd671 = lerFixture('afd-671.txt')

describe('resumirRelatorioAfd', () => {
  it('deve manter contagens e cabeçalho e deixar as coleções de fora', () => {
    const resumo = resumirRelatorioAfd(afd671)

    expect(resumo).toMatchObject({
      portaria: '671',
      leiauteMisto: false,
      cabecalho: afd671.cabecalho,
      contagemPorTipo: afd671.contagemPorTipo,
      contagemOperacoes: afd671.contagemOperacoes,
      totalLinhas: afd671.totalLinhas,
      linhasIgnoradas: 1,
      totalLinhasInvalidas: afd671.totalLinhasInvalidas,
      linhasInvalidas: afd671.linhasInvalidas,
    })
    for (const colecao of ['marcacoes', 'ajustesRelogio', 'empregados', 'eventosRep', 'trailer']) {
      expect(resumo).not.toHaveProperty(colecao)
    }
  })
})

describe('normalizarTexto', () => {
  it('deve remover acentos e passar para maiúsculas', () => {
    expect(normalizarTexto('João da Conceição')).toBe('JOAO DA CONCEICAO')
  })
})

describe('criarConsultorAfd', () => {
  describe('paginação', () => {
    it('deve devolver a aba inteira na ordem do arquivo sem filtros', () => {
      const resultado = criarConsultorAfd(afd671).consultar(consulta('marcacoes'))

      expect(resultado.total).toBe(5)
      expect(resultado.itens).toEqual(afd671.marcacoes)
    })

    it('deve fatiar pelo offset e pelo limite', () => {
      const resultado = criarConsultorAfd(afd671).consultar({ ...consulta('marcacoes'), offset: 2, limite: 2 })

      expect(nsrs(resultado.itens)).toEqual([7, 8])
      expect(resultado.total).toBe(5)
    })

    it('deve devolver página vazia além do fim, mantendo o total', () => {
      const resultado = criarConsultorAfd(afd671).consultar({ ...consulta('marcacoes'), offset: 10, limite: 5 })

      expect(resultado).toEqual({ itens: [], total: 5 })
    })

    it('deve tratar offset negativo como zero e limite negativo como página vazia', () => {
      const consultor = criarConsultorAfd(afd671)

      expect(nsrs(consultor.consultar({ ...consulta('marcacoes'), offset: -3, limite: 1 }).itens)).toEqual([5])
      expect(consultor.consultar({ ...consulta('marcacoes'), limite: -1 }).itens).toEqual([])
    })
  })

  describe('filtros', () => {
    const consultor = criarConsultorAfd(afd671)

    it('deve filtrar por nome sem diferenciar maiúsculas nem acentos', () => {
      expect(nsrs(consultor.consultar(consulta('marcacoes', { nome: 'joao' })).itens)).toEqual([5])
      expect(nsrs(consultor.consultar(consulta('empregados', { nome: 'conceicao' })).itens)).toEqual([2, 14])
    })

    it('deve filtrar por CPF/PIS ignorando pontuação e zeros à esquerda', () => {
      expect(nsrs(consultor.consultar(consulta('marcacoes', { cpfPis: '0.123.456' })).itens)).toEqual([5])
    })

    it('deve filtrar pela data', () => {
      expect(nsrs(consultor.consultar(consulta('marcacoes', { data: '2026-01-06' })).itens)).toEqual([13])
    })

    it('deve filtrar empregados pela operação', () => {
      expect(nsrs(consultor.consultar(consulta('empregados', { operacao: 'A' })).itens)).toEqual([4])
    })

    it('deve filtrar eventos pelo código', () => {
      expect(nsrs(consultor.consultar(consulta('eventosRep', { codigoEvento: '07' })).itens)).toEqual([11])
    })

    it('deve combinar os filtros', () => {
      const resultado = consultor.consultar(consulta('marcacoes', { nome: 'maria', data: '2026-01-05' }))

      expect(nsrs(resultado.itens)).toEqual([6])
    })

    it('deve ignorar filtro que não se aplica à aba', () => {
      expect(consultor.consultar(consulta('eventosRep', { nome: 'maria' })).total).toBe(3)
      // O CPF do responsável pelo ajuste não identifica empregado.
      expect(consultor.consultar(consulta('ajustesRelogio', { cpfPis: '99988877766' })).total).toBe(1)
      expect(consultor.consultar(consulta('marcacoes', { codigoEvento: '07', operacao: 'E' })).total).toBe(5)
    })

    it('deve tratar filtro só com espaços como ausente', () => {
      expect(consultor.consultar(consulta('marcacoes', { nome: '   ', data: ' ' })).total).toBe(5)
    })
  })

  describe('ordem', () => {
    it('deve ordenar por data e hora, desempatando pela linha', () => {
      const relatorio = parsearAfd([
        '0000000013' + '02012020' + '0800' + '000000000001',
        '0000000023' + '01012020' + '0900' + '000000000002',
        '0000000033' + '01012020' + '0800' + '000000000003',
        '0000000043' + '01012020' + '0800' + '000000000004',
      ])
      const consultor = criarConsultorAfd(relatorio)

      expect(nsrs(consultor.consultar(consulta('marcacoes', {}, 'data-crescente')).itens)).toEqual([3, 4, 2, 1])
      expect(nsrs(consultor.consultar(consulta('marcacoes', {}, 'data-decrescente')).itens)).toEqual([1, 2, 3, 4])
    })

    it('deve ordenar por nome, desempatando pela linha', () => {
      const resultado = criarConsultorAfd(afd671).consultar(consulta('marcacoes', {}, 'nome'))

      // Desconhecido (7, 8), JOÃO (5), MARIA (6, 13)
      expect(nsrs(resultado.itens)).toEqual([7, 8, 5, 6, 13])
    })

    it('deve manter a ordem do arquivo ao ordenar por nome uma aba sem nome', () => {
      const resultado = criarConsultorAfd(afd671).consultar(consulta('eventosRep', {}, 'nome'))

      expect(resultado.itens).toEqual(afd671.eventosRep)
    })

    it('deve ordenar sem alterar a coleção do relatório', () => {
      const relatorio = lerFixture('afd-671.txt')
      const original = [...relatorio.marcacoes]

      criarConsultorAfd(relatorio).consultar(consulta('marcacoes', {}, 'data-decrescente'))

      expect(relatorio.marcacoes).toEqual(original)
    })
  })

  describe('cache', () => {
    // A coleção é alterada depois da primeira consulta: se a página seguinte
    // não enxerga a alteração, o conjunto filtrado veio do cache.
    function consultorComAlteracao() {
      const relatorio = lerFixture('afd-671.txt')
      const consultor = criarConsultorAfd(relatorio)
      const filtrada = consulta('marcacoes', { nome: 'maria' }, 'data-crescente')
      const primeira = consultor.consultar({ ...filtrada, limite: 1 })
      relatorio.marcacoes.push({ ...relatorio.marcacoes[1], nsr: '000000099', linha: 99 })
      return { consultor, filtrada, primeira }
    }

    it('deve reaproveitar o conjunto filtrado ao trocar de página', () => {
      const { consultor, filtrada, primeira } = consultorComAlteracao()

      const segunda = consultor.consultar({ ...filtrada, offset: 1, limite: 1 })

      expect(primeira.total).toBe(2)
      expect(segunda.total).toBe(2)
      expect(nsrs(segunda.itens)).toEqual([13])
    })

    it('deve refazer a filtragem quando os filtros mudam', () => {
      const { consultor, filtrada } = consultorComAlteracao()

      expect(consultor.consultar({ ...filtrada, filtros: { nome: 'aparecida' } }).total).toBe(3)
    })

    it('deve tratar filtros equivalentes depois de normalizados como a mesma consulta', () => {
      const { consultor, filtrada } = consultorComAlteracao()

      expect(consultor.consultar({ ...filtrada, filtros: { nome: ' MARIA ' } }).total).toBe(2)
    })

    it('deve refazer a filtragem quando a ordem muda', () => {
      const { consultor, filtrada } = consultorComAlteracao()

      expect(consultor.consultar({ ...filtrada, ordem: 'arquivo' }).total).toBe(3)
    })
  })
})
