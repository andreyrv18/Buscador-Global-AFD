import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Download, Locator, Page } from '@playwright/test';
import { test, expect } from './fixtures';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixture = (nome: string) => path.resolve(__dirname, '../src/afd/__fixtures__', nome);

const ABAS = {
    funcionarios: ['Funcionários (Tipo 5)', 'view-afd-funcionarios'],
    relogio: ['Ajustes Relógio (Tipo 4)', 'view-afd-relogio'],
    eventos: ['Eventos REP (Tipo 6)', 'view-afd-eventos'],
    marcacoes: ['Marcações (Tipo 3/7)', 'view-afd-marcacoes'],
} as const;

async function abrirAba(page: Page, aba: keyof typeof ABAS): Promise<Locator> {
    const [rotulo, testId] = ABAS[aba];
    await page.getByRole('button', { name: rotulo, exact: true }).click();
    const view = page.getByTestId(testId);
    await expect(view.getByRole('table')).toBeVisible();
    return view;
}

/** Linhas de dados da tabela da view (sem o cabeçalho). */
const linhas = (view: Locator) => view.getByRole('row').filter({ has: view.page().getByRole('cell') });

async function baixar(page: Page, rotulo: string): Promise<{ download: Download; conteudo: Buffer }> {
    const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: rotulo }).click()]);
    const caminho = await download.path();
    return { download, conteudo: readFileSync(caminho) };
}

test.describe('Abas do AFD com a fixture da Portaria 671', () => {
    test.beforeEach(async ({ page, extensionId }) => {
        await page.goto(`chrome-extension://${extensionId}/src/index.html`);
        await page.getByLabel('Selecionar arquivo').setInputFiles(fixture('afd-671.txt'));
        await expect(page.getByRole('status').filter({ hasText: 'linhas lidas' })).toHaveText(
            'Portaria 671 · 20 linhas lidas · 3 linhas inválidas',
        );
    });

    test('deve mostrar em cada aba a contagem que o arquivo produz', async ({ page }) => {
        const funcionarios = await abrirAba(page, 'funcionarios');
        const cards = funcionarios.getByRole('group', { name: 'Filtrar por operação' });
        await expect(cards.getByRole('button', { name: /^Todas/ })).toContainText(/4\s*de 4 no arquivo/);
        await expect(cards.getByRole('button', { name: /^Inclusão/ })).toContainText(/2\s*de 2 no arquivo/);
        await expect(cards.getByRole('button', { name: /^Alteração/ })).toContainText(/1\s*de 1 no arquivo/);
        await expect(cards.getByRole('button', { name: /^Exclusão/ })).toContainText(/1\s*de 1 no arquivo/);
        await expect(linhas(funcionarios)).toHaveCount(4);

        const relogio = await abrirAba(page, 'relogio');
        await expect(relogio.getByText('1 de 1 ajustes')).toBeVisible();
        await expect(linhas(relogio)).toHaveCount(1);
        await expect(linhas(relogio).first()).toContainText('99988877766');

        const eventos = await abrirAba(page, 'eventos');
        await expect(eventos.getByText(/eventos encontrados de/)).toHaveText('3 eventos encontrados de 3 no arquivo');
        await expect(linhas(eventos)).toHaveCount(3);

        const marcacoes = await abrirAba(page, 'marcacoes');
        await expect(marcacoes.getByText(/Total no arquivo/)).toHaveText('Total no arquivo: 5 · Encontradas: 5');
        await expect(linhas(marcacoes)).toHaveCount(5);
        await expect(linhas(marcacoes).last()).toContainText('Aplicativo mobile');
    });

    test('deve notificar a conclusão da leitura', async ({ page }) => {
        const notificacoes = await page.evaluate(() => chrome.notifications.getAll());

        expect(Object.keys(notificacoes)).toHaveLength(1);
    });

    test('deve filtrar as marcações por nome e pela operação nos cards', async ({ page }) => {
        const marcacoes = await abrirAba(page, 'marcacoes');
        await marcacoes.getByLabel('Colaborador').fill('maria');

        await expect(marcacoes.getByText(/Total no arquivo/)).toHaveText('Total no arquivo: 5 · Encontradas: 2');
        await expect(linhas(marcacoes)).toHaveCount(2);

        const funcionarios = await abrirAba(page, 'funcionarios');
        await funcionarios.getByRole('button', { name: /^Exclusão/ }).click();

        await expect(funcionarios.getByRole('button', { name: /^Exclusão/ })).toHaveAttribute('aria-pressed', 'true');
        await expect(linhas(funcionarios)).toHaveCount(1);
        await expect(linhas(funcionarios).first()).toContainText('JOÃO DA CONCEIÇÃO');
    });

    test('deve exportar o relatório em JSON sem duplicar o Tipo 5', async ({ page }) => {
        const { download, conteudo } = await baixar(page, 'Exportar relatório (JSON)');
        const relatorio = JSON.parse(conteudo.toString('utf8'));

        expect(download.suggestedFilename()).toMatch(/^auditoria_afd_\d+\.json$/);
        expect(relatorio).not.toHaveProperty('porData');
        expect(relatorio).not.toHaveProperty('porCPF');
        expect(relatorio.porOperacao).toEqual({ Inclusão: 2, Alteração: 1, Exclusão: 1 });
        expect(relatorio.empregados).toHaveLength(4);
        expect(relatorio.marcacoes).toHaveLength(5);
    });

    test('deve exportar em CSV as marcações filtradas, na ordem da tela', async ({ page }) => {
        const marcacoes = await abrirAba(page, 'marcacoes');
        await marcacoes.getByLabel('Colaborador').fill('maria');
        await marcacoes.getByRole('combobox', { name: 'Ordem' }).click();
        await page.getByRole('option', { name: 'Data decrescente' }).click();
        await expect(marcacoes.getByText(/Total no arquivo/)).toHaveText('Total no arquivo: 5 · Encontradas: 2');

        const { download, conteudo } = await baixar(page, 'Exportar CSV');
        const texto = conteudo.toString('utf8');
        const [cabecalho, ...dados] = texto.replace(/^﻿/, '').trimEnd().split('\r\n');

        expect(download.suggestedFilename()).toMatch(/^afd_marcacoes_\d+\.csv$/);
        expect([...conteudo.subarray(0, 3)]).toEqual([0xef, 0xbb, 0xbf]);
        expect(cabecalho).toBe('Data;Hora;NSR;CPF/PIS;Colaborador;Coletor;On-line/Off-line');
        expect(dados.map((linha) => linha.split(';')[2])).toEqual(['000000013', '000000006']);
    });
});

test.describe('Paginação das marcações', () => {
    // A maior fixture tem 5 marcações, menos que a menor página (10): para
    // paginar, o arquivo é gerado aqui no leiaute 1510, um dia por marcação.
    const marcacoes = Array.from({ length: 25 }, (_, i) => {
        const nsr = String(i + 1).padStart(9, '0');
        const dia = String(i + 1).padStart(2, '0');
        const pis = String(i + 1).padStart(12, '0');
        return `${nsr}3${dia}0120260800${pis}`;
    }).join('\r\n');

    test.beforeEach(async ({ page, extensionId }) => {
        await page.goto(`chrome-extension://${extensionId}/src/index.html`);
        await page.getByLabel('Selecionar arquivo').setInputFiles({
            name: 'AFD-paginacao.txt',
            mimeType: 'text/plain',
            buffer: Buffer.from(marcacoes, 'latin1'),
        });
        await expect(page.getByRole('status').filter({ hasText: 'linhas lidas' })).toContainText('25 linhas lidas');
    });

    test('deve trocar de página e mudar o tamanho da página', async ({ page }) => {
        const view = await abrirAba(page, 'marcacoes');
        await expect(view.getByText('Página 1 de 3')).toBeVisible();
        await expect(linhas(view)).toHaveCount(10);
        await expect(linhas(view).first()).toContainText('01/01/2026');

        await view.getByRole('button', { name: 'Próxima' }).click();
        await expect(view.getByText('Página 2 de 3')).toBeVisible();
        await expect(view.getByText('11–20 de 25 registros')).toBeVisible();
        await expect(linhas(view).first()).toContainText('11/01/2026');

        await view.getByRole('button', { name: 'Próxima' }).click();
        await expect(linhas(view)).toHaveCount(5);
        await expect(view.getByRole('button', { name: 'Próxima' })).toBeDisabled();

        await view.getByRole('combobox', { name: 'Itens por página' }).click();
        await page.getByRole('option', { name: '50', exact: true }).click();
        await expect(view.getByText('Página 1 de 1')).toBeVisible();
        await expect(linhas(view)).toHaveCount(25);
    });
});
