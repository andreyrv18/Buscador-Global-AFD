import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { act, fireEvent, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { decodificarAfd, parsearAfd } from "../../afd/parser";
import type { RelatorioAfd } from "../../afd/tipos";
import { ATRASO_FILTROS_MS } from "../../hooks/useFiltrosAfd";
import { renderizarComAfd } from "../../state/renderizarComAfd";
import { RelogioAfdView } from "./RelogioAfdView";

function lerFixture(nome: string): RelatorioAfd {
    // No jsdom o import.meta.url não é file://; o Vitest roda a partir da raiz.
    const caminho = resolve(process.cwd(), "src/afd/__fixtures__", nome);
    return parsearAfd(decodificarAfd(readFileSync(caminho)));
}

/** 25 ajustes no leiaute legado, um por dia de janeiro/2026, de 08:00 para 08:05. */
function relatorioComAjustes(quantidade = 25): RelatorioAfd {
    const linhas = Array.from({ length: quantidade }, (_, indice) => {
        const nsr = String(indice + 1).padStart(9, "0");
        const dia = String(indice + 1).padStart(2, "0");
        return `${nsr}4${dia}0120260800${dia}0120260805`;
    });
    return parsearAfd(linhas);
}

/** Linhas de dados da tabela (sem o cabeçalho). */
const linhasDaTabela = () => screen.getAllByRole("row").slice(1);

afterEach(() => {
    vi.useRealTimers();
});

describe("RelogioAfdView", () => {
    it("deve orientar a selecionar um arquivo quando nenhum AFD foi lido", () => {
        renderizarComAfd(<RelogioAfdView />);

        const view = screen.getByTestId("view-afd-relogio");
        expect(within(view).getByText(/selecione um arquivo afd acima/i)).toBeInTheDocument();
        expect(screen.queryByRole("table")).not.toBeInTheDocument();
    });

    it("deve mostrar as colunas e o ajuste formatado da Portaria 671", async () => {
        const { carregar } = renderizarComAfd(<RelogioAfdView />);
        await carregar(lerFixture("afd-671.txt"));

        const cabecalhos = screen.getAllByRole("columnheader").map((th) => th.textContent);
        expect(cabecalhos).toEqual(["Antes", "Depois", "CPF do responsável"]);

        const [linha] = linhasDaTabela();
        const celulas = within(linha).getAllByRole("cell");
        expect(celulas.map((td) => td.textContent)).toEqual([
            "05/01/2026 09:00",
            "05/01/2026 09:05",
            "99988877766",
        ]);
    });

    it("deve mostrar Não informado quando o leiaute não traz o CPF do responsável", async () => {
        const { carregar } = renderizarComAfd(<RelogioAfdView />);
        await carregar(lerFixture("afd-1510.txt"));

        const [linha] = linhasDaTabela();
        expect(within(linha).getByText("Não informado")).toBeInTheDocument();
    });

    it("deve contar os ajustes filtrados e os do arquivo", async () => {
        const { carregar } = renderizarComAfd(<RelogioAfdView />);
        await carregar(relatorioComAjustes());

        expect(screen.getByText("25 de 25 ajustes")).toBeInTheDocument();
    });

    it("deve não oferecer filtro de CPF nem de nome", async () => {
        const { carregar } = renderizarComAfd(<RelogioAfdView />);
        await carregar(relatorioComAjustes());

        expect(screen.getByLabelText("Data do ajuste (antes)")).toBeInTheDocument();
        expect(screen.queryByLabelText(/cpf|pis/i)).not.toBeInTheDocument();
        expect(screen.queryByLabelText(/nome/i)).not.toBeInTheDocument();
    });

    it("deve filtrar pela data do ajuste depois do debounce", async () => {
        const { carregar, responder, worker } = renderizarComAfd(<RelogioAfdView />);
        await carregar(relatorioComAjustes());
        vi.useFakeTimers();

        fireEvent.change(screen.getByLabelText("Data do ajuste (antes)"), {
            target: { value: "2026-01-15" },
        });
        const consultasAntes = worker().consultas.length;
        act(() => vi.advanceTimersByTime(ATRASO_FILTROS_MS - 1));
        expect(worker().consultas).toHaveLength(consultasAntes);

        act(() => vi.advanceTimersByTime(1));
        await responder();

        const consultas = worker().consultas;
        expect(consultas[consultas.length - 1]?.filtros.data).toBe("2026-01-15");
        expect(screen.getByText("1 de 25 ajustes")).toBeInTheDocument();
        const linhas = linhasDaTabela();
        expect(linhas).toHaveLength(1);
        expect(within(linhas[0]).getByText("15/01/2026 08:00")).toBeInTheDocument();
    });

    it("deve trocar de página", async () => {
        const usuario = userEvent.setup();
        const { carregar, responder } = renderizarComAfd(<RelogioAfdView />);
        await carregar(relatorioComAjustes());

        expect(linhasDaTabela()).toHaveLength(10);
        expect(within(linhasDaTabela()[0]).getByText("01/01/2026 08:00")).toBeInTheDocument();

        await usuario.click(screen.getByRole("button", { name: "Próxima" }));
        await responder();

        expect(screen.getByText("Página 2 de 3")).toBeInTheDocument();
        expect(within(linhasDaTabela()[0]).getByText("11/01/2026 08:00")).toBeInTheDocument();
    });

    it("deve inverter a ordem por data", async () => {
        const usuario = userEvent.setup();
        const { carregar, responder } = renderizarComAfd(<RelogioAfdView />);
        await carregar(relatorioComAjustes());

        await usuario.click(screen.getByRole("combobox", { name: "Ordem" }));
        await usuario.click(screen.getByRole("option", { name: "Data decrescente" }));
        await responder();

        expect(screen.getByRole("combobox", { name: "Ordem" })).toHaveTextContent("Data decrescente");
        expect(within(linhasDaTabela()[0]).getByText("25/01/2026 08:00")).toBeInTheDocument();
    });

    it("deve avisar enquanto a consulta não volta do worker", async () => {
        const usuario = userEvent.setup();
        const { carregar } = renderizarComAfd(<RelogioAfdView />);
        await carregar(relatorioComAjustes());

        await usuario.click(screen.getByRole("button", { name: "Próxima" }));

        expect(screen.getByRole("status")).toHaveTextContent("Carregando ajustes…");
    });
});
