import { act, fireEvent, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { parsearAfd } from "../../afd/parser";
import type { OperacaoEmpregado } from "../../afd/tipos";
import { ATRASO_FILTROS_MS } from "../../hooks/useFiltrosAfd";
import { renderizarComAfd } from "../../state/renderizarComAfd";
import { FuncionariosAfdView } from "./FuncionariosAfdView";

/** Linha Tipo 5 da Portaria 671 (posições da seção 1.2 do plano). */
function linhaTipo5(nsr: number, dia: number, operacao: OperacaoEmpregado, cpf: string, nome: string): string {
    const data = `2026-01-${String(dia).padStart(2, "0")}T08:00:00-0300`;
    return `${String(nsr).padStart(9, "0")}5${data}${operacao}${cpf.padEnd(12)}${nome.padEnd(52)}000099988877766`;
}

// 12 registros, dois por dia (01/01 a 06/01): 6 inclusões, 3 alterações e
// 3 exclusões. Só o primeiro se chama Ana; os demais, "COLABORADOR NN".
const operacaoDo = (indice: number): OperacaoEmpregado => (indice <= 6 ? "I" : indice <= 9 ? "A" : "E");

const linhas = Array.from({ length: 12 }, (_, posicao) => {
    const indice = posicao + 1;
    const nome = indice === 1 ? "ANA SOUZA" : `COLABORADOR ${String(indice).padStart(2, "0")}`;
    const cpf = `100000000${String(indice).padStart(2, "0")}`;
    return linhaTipo5(indice, Math.ceil(indice / 2), operacaoDo(indice), cpf, nome);
});

const relatorio = parsearAfd(linhas.join("\n"));

/** Linhas de dados da tabela, sem o cabeçalho. */
const linhasDaTabela = () => {
    const [, corpo] = screen.getAllByRole("rowgroup");
    return within(corpo).getAllByRole("row");
};

afterEach(() => {
    vi.useRealTimers();
});

describe("FuncionariosAfdView", () => {
    it("deve orientar a selecionar um arquivo enquanto nenhum AFD foi lido", () => {
        renderizarComAfd(<FuncionariosAfdView />);

        expect(screen.getByTestId("view-afd-funcionarios")).toBeInTheDocument();
        expect(screen.getByText(/selecione um arquivo afd acima/i)).toBeInTheDocument();
        expect(screen.queryByRole("table")).not.toBeInTheDocument();
    });

    it("deve exibir as colunas e a primeira página após carregar o arquivo", async () => {
        const { carregar } = renderizarComAfd(<FuncionariosAfdView />);
        await carregar(relatorio);

        const titulos = screen.getAllByRole("columnheader").map((coluna) => coluna.textContent);
        expect(titulos).toEqual(["Data", "Hora", "Operação", "CPF/PIS", "Colaborador"]);

        const linhas = linhasDaTabela();
        expect(linhas).toHaveLength(10);
        const celulas = within(linhas[0]).getAllByRole("cell").map((celula) => celula.textContent);
        expect(celulas).toEqual(["01/01/2026", "08:00", "Inclusão", "10000000001", "ANA SOUZA"]);
        expect(screen.getByText("1–10 de 12 registros")).toBeInTheDocument();
    });

    it("deve aplicar o filtro por nome depois do atraso de digitação", async () => {
        vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
        const { carregar, responder, worker } = renderizarComAfd(<FuncionariosAfdView />);
        await carregar(relatorio);
        const consultasAntes = worker().consultas.length;

        fireEvent.change(screen.getByLabelText("Nome"), { target: { value: "ana" } });
        expect(worker().consultas).toHaveLength(consultasAntes);

        act(() => vi.advanceTimersByTime(ATRASO_FILTROS_MS));
        await responder();

        const linhas = linhasDaTabela();
        expect(linhas).toHaveLength(1);
        expect(within(linhas[0]).getByText("ANA SOUZA")).toBeInTheDocument();
    });

    it("deve ir para a próxima página", async () => {
        const { carregar, responder } = renderizarComAfd(<FuncionariosAfdView />);
        await carregar(relatorio);

        fireEvent.click(screen.getByRole("button", { name: "Próxima" }));
        await responder();

        expect(screen.getByText("Página 2 de 2")).toBeInTheDocument();
        const nomes = linhasDaTabela().map((linha) => within(linha).getAllByRole("cell")[4].textContent);
        expect(nomes).toEqual(["COLABORADOR 11", "COLABORADOR 12"]);
    });

    it("deve ordenar por data decrescente", async () => {
        const { carregar, responder } = renderizarComAfd(<FuncionariosAfdView />);
        await carregar(relatorio);

        fireEvent.click(screen.getByRole("combobox", { name: "Ordem" }));
        fireEvent.click(screen.getByRole("option", { name: "Data decrescente" }));
        await responder();

        const primeira = within(linhasDaTabela()[0]).getAllByRole("cell");
        expect(primeira[0].textContent).toBe("06/01/2026");
    });

    it("deve mostrar nos cards a contagem filtrada e o total do arquivo", async () => {
        vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
        const { carregar, responder } = renderizarComAfd(<FuncionariosAfdView />);
        await carregar(relatorio);

        expect(screen.getByRole("button", { name: /^Todas/ })).toHaveTextContent("Todas12de 12 no arquivo");
        expect(screen.getByRole("button", { name: /^Inclusão/ })).toHaveTextContent("Inclusão6de 6 no arquivo");
        expect(screen.getByRole("button", { name: /^Alteração/ })).toHaveTextContent("Alteração3de 3 no arquivo");
        expect(screen.getByRole("button", { name: /^Exclusão/ })).toHaveTextContent("Exclusão3de 3 no arquivo");

        fireEvent.change(screen.getByLabelText("Nome"), { target: { value: "colaborador" } });
        act(() => vi.advanceTimersByTime(ATRASO_FILTROS_MS));
        await responder();

        expect(screen.getByRole("button", { name: /^Todas/ })).toHaveTextContent("Todas11de 12 no arquivo");
        expect(screen.getByRole("button", { name: /^Inclusão/ })).toHaveTextContent("Inclusão5de 6 no arquivo");
    });

    it("deve filtrar pela operação ao clicar no card e indicar o card ativo", async () => {
        const { carregar, responder } = renderizarComAfd(<FuncionariosAfdView />);
        await carregar(relatorio);

        const todas = screen.getByRole("button", { name: /^Todas/ });
        const exclusao = screen.getByRole("button", { name: /^Exclusão/ });
        expect(todas).toHaveAttribute("aria-pressed", "true");
        expect(exclusao).toHaveAttribute("aria-pressed", "false");

        fireEvent.click(exclusao);
        await responder();

        expect(exclusao).toHaveAttribute("aria-pressed", "true");
        expect(todas).toHaveAttribute("aria-pressed", "false");
        const operacoes = linhasDaTabela().map((linha) => within(linha).getAllByRole("cell")[2].textContent);
        expect(operacoes).toEqual(["Exclusão", "Exclusão", "Exclusão"]);
        // A contagem por operação ignora o filtro de operação.
        expect(todas).toHaveTextContent("Todas12de 12 no arquivo");
    });

    it("deve alternar a zebra a cada dia e colorir a linha pela operação", async () => {
        const { carregar } = renderizarComAfd(<FuncionariosAfdView />);
        await carregar(relatorio);

        const [dia1a, dia1b, dia2a, dia2b, dia3a] = linhasDaTabela();
        expect(dia1a).not.toHaveClass("bga-funcionarios-afd__linha--zebra");
        expect(dia1b).not.toHaveClass("bga-funcionarios-afd__linha--zebra");
        expect(dia2a).toHaveClass("bga-funcionarios-afd__linha--zebra");
        expect(dia2b).toHaveClass("bga-funcionarios-afd__linha--zebra");
        expect(dia3a).not.toHaveClass("bga-funcionarios-afd__linha--zebra");

        expect(dia1a).toHaveClass("bga-funcionarios-afd__linha--inclusao");
        const linhaAlteracao = linhasDaTabela()[6];
        expect(linhaAlteracao).toHaveClass("bga-funcionarios-afd__linha--alteracao");
    });
});
