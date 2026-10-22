import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { act, fireEvent, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { decodificarAfd, parsearAfd } from "../../afd/parser";
import type { RelatorioAfd } from "../../afd/tipos";
import { ATRASO_FILTROS_MS } from "../../hooks/useFiltrosAfd";
import { renderizarComAfd } from "../../state/renderizarComAfd";
import { MarcacoesAfdView } from "./MarcacoesAfdView";

function lerFixture(nome: string): RelatorioAfd {
    // No jsdom o import.meta.url não é file://; o Vitest roda a partir da raiz.
    const caminho = resolve(process.cwd(), "src/afd/__fixtures__", nome);
    return parsearAfd(decodificarAfd(readFileSync(caminho)));
}

/** Marcações no leiaute legado, uma por dia de janeiro/2026, às 08:00, PIS 1, 2, 3… */
function relatorioComMarcacoes(quantidade: number): RelatorioAfd {
    const linhas = Array.from({ length: quantidade }, (_, indice) => {
        const nsr = String(indice + 1).padStart(9, "0");
        const dia = String(indice + 1).padStart(2, "0");
        const pis = String(indice + 1).padStart(12, "0");
        return `${nsr}3${dia}0120260800${pis}`;
    });
    return parsearAfd(linhas);
}

/** Linhas de dados da tabela (sem o cabeçalho). */
const linhasDaTabela = () => screen.getAllByRole("row").slice(1);

/** Texto das células de uma linha. */
const celulas = (linha: HTMLElement) => within(linha).getAllByRole("cell").map((td) => td.textContent);

// Marcações da fixture 671: NSR 5 (João), 6 (Maria), 7 e 8 (sem Tipo 5),
// todas em 05/01, e NSR 13 (Maria, Tipo 7, coletor 01, off-line) em 06/01.
const afd671 = lerFixture("afd-671.txt");

afterEach(() => {
    vi.useRealTimers();
});

describe("MarcacoesAfdView", () => {
    it("deve orientar a selecionar um arquivo quando nenhum AFD foi lido", () => {
        renderizarComAfd(<MarcacoesAfdView />);

        const view = screen.getByTestId("view-afd-marcacoes");
        expect(within(view).getByText(/selecione um arquivo afd acima/i)).toBeInTheDocument();
        expect(screen.queryByRole("table")).not.toBeInTheDocument();
    });

    it("deve mostrar as colunas, as marcações e as colunas do REP-P na Portaria 671", async () => {
        const { carregar } = renderizarComAfd(<MarcacoesAfdView />);
        await carregar(afd671);

        const cabecalhos = screen.getAllByRole("columnheader").map((th) => th.textContent);
        expect(cabecalhos).toEqual(["Data", "Hora", "NSR", "CPF/PIS", "Colaborador", "Coletor", "On-line/Off-line"]);

        const linhas = linhasDaTabela();
        expect(linhas).toHaveLength(5);
        expect(celulas(linhas[0])).toEqual(["05/01/2026", "08:00", "000000005", "12345678901", "JOÃO DA CONCEIÇÃO", "—", "—"]);
        expect(celulas(linhas[2])).toEqual(["05/01/2026", "08:02", "000000007", "55566677788", "Desconhecido", "—", "—"]);
        expect(celulas(linhas[4])).toEqual([
            "06/01/2026",
            "08:00",
            "000000013",
            "98765432100",
            "MARIA APARECIDA SOUZA",
            "Aplicativo mobile",
            "Off-line",
        ]);
    });

    it("deve mostrar on-line, coletor desconhecido e campos ausentes do Tipo 7", async () => {
        const gravacao = "2026-01-06T08:00:05-0300";
        const relatorio = parsearAfd([
            `0000000017${"2026-01-06T08:00:00-0300"}98765432100 ${gravacao}020`,
            `0000000027${"2026-01-06T08:01:00-0300"}98765432100 ${gravacao}090`,
            `0000000037${"2026-01-06T08:02:00-0300"}98765432100 `,
        ]);
        const { carregar } = renderizarComAfd(<MarcacoesAfdView />);
        await carregar(relatorio);

        const finais = linhasDaTabela().map((linha) => celulas(linha).slice(5));
        expect(finais).toEqual([
            ["Browser (navegador internet)", "On-line"],
            ["Código 09", "On-line"],
            ["Não informado", "Não informado"],
        ]);
    });

    it("deve omitir as colunas de coletor e on-line/off-line em arquivo sem Tipo 7", async () => {
        const { carregar } = renderizarComAfd(<MarcacoesAfdView />);
        await carregar(lerFixture("afd-1510.txt"));

        const cabecalhos = screen.getAllByRole("columnheader").map((th) => th.textContent);
        expect(cabecalhos).toEqual(["Data", "Hora", "NSR", "CPF/PIS", "Colaborador"]);
    });

    it("deve mostrar o total do arquivo e o total encontrado", async () => {
        const { carregar } = renderizarComAfd(<MarcacoesAfdView />);
        await carregar(afd671);

        const contador = screen.getByText(/total no arquivo/i);
        expect(contador).toHaveTextContent("Total no arquivo: 5 · Encontradas: 5");
    });

    it("deve filtrar por CPF/PIS depois do debounce", async () => {
        vi.useFakeTimers();
        const { carregar, responder } = renderizarComAfd(<MarcacoesAfdView />);
        await carregar(afd671);

        fireEvent.change(screen.getByLabelText("CPF/PIS"), { target: { value: "987.654.321-00" } });
        expect(screen.getByLabelText("CPF/PIS")).toHaveValue("98765432100");
        act(() => vi.advanceTimersByTime(ATRASO_FILTROS_MS));
        await responder();

        expect(linhasDaTabela().map((linha) => celulas(linha)[2])).toEqual(["000000006", "000000013"]);
        expect(screen.getByText(/total no arquivo/i)).toHaveTextContent("Total no arquivo: 5 · Encontradas: 2");
    });

    it("deve filtrar por nome depois do debounce", async () => {
        vi.useFakeTimers();
        const { carregar, responder } = renderizarComAfd(<MarcacoesAfdView />);
        await carregar(afd671);

        fireEvent.change(screen.getByLabelText("Colaborador"), { target: { value: "joao" } });
        act(() => vi.advanceTimersByTime(ATRASO_FILTROS_MS));
        await responder();

        expect(linhasDaTabela().map((linha) => celulas(linha)[2])).toEqual(["000000005"]);
    });

    it("deve filtrar por data", async () => {
        vi.useFakeTimers();
        const { carregar, responder } = renderizarComAfd(<MarcacoesAfdView />);
        await carregar(afd671);

        fireEvent.change(screen.getByLabelText("Data"), { target: { value: "2026-01-06" } });
        act(() => vi.advanceTimersByTime(ATRASO_FILTROS_MS));
        await responder();

        expect(linhasDaTabela().map((linha) => celulas(linha)[2])).toEqual(["000000013"]);
    });

    it("deve ordenar da data mais recente para a mais antiga", async () => {
        const usuario = userEvent.setup();
        const { carregar, responder } = renderizarComAfd(<MarcacoesAfdView />);
        await carregar(afd671);

        await usuario.click(screen.getByRole("combobox", { name: "Ordem" }));
        await usuario.click(screen.getByRole("option", { name: "Data decrescente" }));
        await responder();

        expect(linhasDaTabela().map((linha) => celulas(linha)[2])).toEqual([
            "000000013",
            "000000008",
            "000000007",
            "000000006",
            "000000005",
        ]);
    });

    it("deve indicar o carregamento enquanto a consulta não volta", async () => {
        const usuario = userEvent.setup();
        const { carregar, responder } = renderizarComAfd(<MarcacoesAfdView />);
        await carregar(afd671);

        await usuario.click(screen.getByRole("combobox", { name: "Ordem" }));
        await usuario.click(screen.getByRole("option", { name: "Data decrescente" }));

        expect(screen.getByRole("status")).toHaveTextContent("Carregando marcações…");
        await responder();
        expect(screen.queryByRole("status")).not.toBeInTheDocument();
    });

    it("deve trocar de página", async () => {
        const usuario = userEvent.setup();
        const { carregar, responder } = renderizarComAfd(<MarcacoesAfdView />);
        await carregar(relatorioComMarcacoes(12));

        expect(linhasDaTabela()).toHaveLength(10);
        expect(screen.getByText(/total no arquivo/i)).toHaveTextContent("Total no arquivo: 12 · Encontradas: 12");

        await usuario.click(screen.getByRole("button", { name: "Próxima" }));
        await responder();

        expect(linhasDaTabela().map((linha) => celulas(linha)[0])).toEqual(["11/01/2026", "12/01/2026"]);
        expect(screen.getByText("Página 2 de 2")).toBeInTheDocument();
    });

    it("deve alternar a cor da linha a cada dia", async () => {
        const { carregar } = renderizarComAfd(<MarcacoesAfdView />);
        await carregar(afd671);

        const linhas = linhasDaTabela();
        // 05/01 nas quatro primeiras, 06/01 na última.
        for (const linha of linhas.slice(0, 4)) {
            expect(linha).not.toHaveClass("bga-marcacoes-afd__linha--zebra");
        }
        expect(linhas[4]).toHaveClass("bga-marcacoes-afd__linha--zebra");
    });

    it("deve alternar a zebra entre dias consecutivos", async () => {
        const { carregar } = renderizarComAfd(<MarcacoesAfdView />);
        await carregar(relatorioComMarcacoes(4));

        const zebradas = linhasDaTabela().map((linha) => linha.classList.contains("bga-marcacoes-afd__linha--zebra"));
        expect(zebradas).toEqual([false, true, false, true]);
    });

    describe("exportação", () => {
        afterEach(() => {
            vi.restoreAllMocks();
        });

        it("deve exportar em CSV as marcações com os filtros aplicados e baixar o arquivo", async () => {
            const baixados: string[] = [];
            Object.assign(URL, { createObjectURL: () => "blob:csv", revokeObjectURL: () => {} });
            vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (this: HTMLAnchorElement) {
                baixados.push(this.download);
            });
            const usuario = userEvent.setup();
            const { carregar, responder, worker } = renderizarComAfd(<MarcacoesAfdView />);
            await carregar(afd671);
            await usuario.click(screen.getByRole("combobox", { name: "Ordem" }));
            await usuario.click(screen.getByRole("option", { name: "Data decrescente" }));
            await responder();

            await usuario.click(screen.getByRole("button", { name: "Exportar CSV" }));
            const [pedido] = worker().exportacoes;
            await act(async () => worker().responderExportacao(pedido, new Date(5)));

            expect(pedido).toMatchObject({ formato: "csv", criterio: { aba: "marcacoes", ordem: "data-decrescente" } });
            expect(baixados).toEqual(["afd_marcacoes_5.csv"]);
            expect(screen.getByRole("button", { name: "Exportar CSV" })).toBeEnabled();
        });

        it("deve desabilitar a exportação quando nenhuma marcação passa nos filtros", async () => {
            const { carregar } = renderizarComAfd(<MarcacoesAfdView />);
            await carregar(parsearAfd(""));

            expect(screen.getByRole("button", { name: "Exportar CSV" })).toBeDisabled();
        });

        it("deve mostrar o erro de uma exportação que falha", async () => {
            const usuario = userEvent.setup();
            const { carregar, worker } = renderizarComAfd(<MarcacoesAfdView />);
            await carregar(afd671);

            await usuario.click(screen.getByRole("button", { name: "Exportar CSV" }));
            const [pedido] = worker().exportacoes;
            await act(async () =>
                worker().responder({
                    token: pedido.token,
                    tipo: "erroExportacao",
                    idExportacao: pedido.idExportacao,
                    mensagem: "Não foi possível exportar: sem memória",
                }),
            );

            expect(screen.getByRole("alert")).toHaveTextContent("Não foi possível exportar: sem memória");
        });
    });
});
