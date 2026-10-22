import { readFileSync } from "node:fs";
import { join } from "node:path";
import { act, fireEvent, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { decodificarAfd, parsearAfd } from "../../afd/parser";
import type { RelatorioAfd } from "../../afd/tipos";
import { ATRASO_FILTROS_MS } from "../../hooks/useFiltrosAfd";
import { renderizarComAfd } from "../../state/renderizarComAfd";
import { EventosAfdView } from "./EventosAfdView";

function lerFixture(nome: string): RelatorioAfd {
    const bytes = readFileSync(join(__dirname, "../../afd/__fixtures__", nome));
    return parsearAfd(decodificarAfd(bytes));
}

// Fixture 671: eventos 02 (10:00), 07 (10:10) e 08 (10:20), todos em 05/01/2026.
const afd671 = lerFixture("afd-671.txt");

/** Linha Tipo 6 da Portaria 671. */
const linhaEvento = (nsr: number, data: string, hora: string, codigo: string) =>
    `${String(nsr).padStart(9, "0")}6${data}T${hora}:00-0300${codigo}`;

/** 12 eventos 02, um por dia, de 01/03/2026 a 12/03/2026. */
const dozeEventos = parsearAfd(
    Array.from({ length: 12 }, (_, i) =>
        linhaEvento(i + 1, `2026-03-${String(i + 1).padStart(2, "0")}`, "08:00", "02"),
    ),
);

const tabela = () => screen.getByRole("table");
const linhasDoCorpo = () => within(tabela()).getAllByRole("row").slice(1);
const ultimaConsulta = (tela: ReturnType<typeof renderizarComAfd>) => {
    const consultas = tela.worker().consultas;
    return consultas[consultas.length - 1];
};

describe("EventosAfdView", () => {
    afterEach(() => {
        vi.useRealTimers();
    });

    it("deve orientar a selecionar um AFD quando não há arquivo carregado", () => {
        renderizarComAfd(<EventosAfdView />);

        expect(screen.getByTestId("view-afd-eventos")).toBeInTheDocument();
        expect(screen.getByText(/selecione um arquivo afd acima/i)).toBeInTheDocument();
        expect(screen.queryByRole("table")).not.toBeInTheDocument();
    });

    it("deve exibir as colunas e os eventos do arquivo com data e hora formatadas", async () => {
        const tela = renderizarComAfd(<EventosAfdView />);
        await tela.carregar(afd671);

        const cabecalhos = within(tabela()).getAllByRole("columnheader").map((th) => th.textContent);
        expect(cabecalhos).toEqual(["Data/Hora", "Código", "Descrição"]);

        const linhas = linhasDoCorpo();
        expect(linhas).toHaveLength(3);
        const celulas = within(linhas[0]).getAllByRole("cell").map((td) => td.textContent);
        expect(celulas).toEqual(["05/01/2026 10:00", "02", "Retorno de energia (REP-C ou REP-P)"]);
        expect(within(linhas[1]).getByText("Disponibilidade de serviço (somente REP-P)")).toBeInTheDocument();
        expect(within(linhas[2]).getByText("Indisponibilidade de serviço (somente REP-P)")).toBeInTheDocument();
    });

    it("deve exibir a descrição de evento não mapeado como vier do arquivo", async () => {
        const tela = renderizarComAfd(<EventosAfdView />);
        await tela.carregar(parsearAfd([linhaEvento(1, "2026-03-01", "08:00", "99")]));

        const celulas = within(linhasDoCorpo()[0]).getAllByRole("cell").map((td) => td.textContent);
        expect(celulas).toEqual(["01/03/2026 08:00", "99", "Evento não mapeado"]);
    });

    it("deve contar os eventos encontrados e o total do arquivo", async () => {
        const tela = renderizarComAfd(<EventosAfdView />);
        await tela.carregar(afd671);

        expect(screen.getByText(/eventos encontrados de/)).toHaveTextContent(
            "3 eventos encontrados de 3 no arquivo",
        );
    });

    it("deve filtrar pelo código do evento", async () => {
        const user = userEvent.setup();
        const tela = renderizarComAfd(<EventosAfdView />);
        await tela.carregar(afd671);

        await user.click(screen.getByRole("combobox", { name: "Código do evento" }));
        await user.click(
            screen.getByRole("option", { name: "07 — Disponibilidade de serviço (somente REP-P)" }),
        );

        expect(ultimaConsulta(tela)?.filtros.codigoEvento).toBe("07");
        await tela.responder();

        const linhas = linhasDoCorpo();
        expect(linhas).toHaveLength(1);
        expect(within(linhas[0]).getByText("07")).toBeInTheDocument();
        expect(screen.getByText(/encontrado de/)).toHaveTextContent("1 evento encontrado de 3 no arquivo");
    });

    it("deve oferecer os oito códigos de evento do leiaute", async () => {
        const user = userEvent.setup();
        const tela = renderizarComAfd(<EventosAfdView />);
        await tela.carregar(afd671);

        await user.click(screen.getByRole("combobox", { name: "Código do evento" }));

        const opcoes = screen.getAllByRole("option").map((opcao) => opcao.textContent?.slice(0, 2));
        expect(opcoes).toEqual(["01", "02", "03", "04", "05", "06", "07", "08"]);
    });

    it("deve voltar a todos os eventos ao limpar os filtros", async () => {
        const user = userEvent.setup();
        const tela = renderizarComAfd(<EventosAfdView />);
        await tela.carregar(afd671);

        await user.click(screen.getByRole("combobox", { name: "Código do evento" }));
        await user.click(screen.getByRole("option", { name: /^08 — / }));
        await tela.responder();
        expect(linhasDoCorpo()).toHaveLength(1);

        await user.click(screen.getByRole("button", { name: "Limpar filtros" }));
        expect(ultimaConsulta(tela)?.filtros.codigoEvento).toBe("");
        await tela.responder();

        expect(linhasDoCorpo()).toHaveLength(3);
        expect(screen.getByRole("combobox", { name: "Código do evento" })).toHaveTextContent("Todos os eventos");
    });

    it("deve filtrar pela data depois do debounce", async () => {
        vi.useFakeTimers();
        const tela = renderizarComAfd(<EventosAfdView />);
        await tela.carregar(dozeEventos);

        // Campo de data não aceita digitação caractere a caractere no jsdom.
        fireEvent.change(screen.getByLabelText("Data"), { target: { value: "2026-03-05" } });
        expect(ultimaConsulta(tela)?.filtros.data).toBe("");

        act(() => vi.advanceTimersByTime(ATRASO_FILTROS_MS));
        expect(ultimaConsulta(tela)?.filtros.data).toBe("2026-03-05");
        await tela.responder();

        const linhas = linhasDoCorpo();
        expect(linhas).toHaveLength(1);
        expect(within(linhas[0]).getByText("05/03/2026 08:00")).toBeInTheDocument();
    });

    it("deve ordenar do mais recente para o mais antigo", async () => {
        const user = userEvent.setup();
        const tela = renderizarComAfd(<EventosAfdView />);
        await tela.carregar(afd671);

        await user.click(screen.getByRole("combobox", { name: "Ordem" }));
        await user.click(screen.getByRole("option", { name: "Data decrescente" }));

        expect(ultimaConsulta(tela)?.ordem).toBe("data-decrescente");
        await tela.responder();

        const codigos = linhasDoCorpo().map((linha) => within(linha).getAllByRole("cell")[1]?.textContent);
        expect(codigos).toEqual(["08", "07", "02"]);
    });

    it("deve trocar de página", async () => {
        const user = userEvent.setup();
        const tela = renderizarComAfd(<EventosAfdView />);
        await tela.carregar(dozeEventos);

        expect(linhasDoCorpo()).toHaveLength(10);
        expect(screen.getByText("Página 1 de 2")).toBeInTheDocument();

        await user.click(screen.getByRole("button", { name: "Próxima" }));
        expect(ultimaConsulta(tela)?.offset).toBe(10);
        await tela.responder();

        const linhas = linhasDoCorpo();
        expect(linhas).toHaveLength(2);
        expect(within(linhas[0]).getByText("11/03/2026 08:00")).toBeInTheDocument();
        expect(screen.getByText("Página 2 de 2")).toBeInTheDocument();
    });

    it("deve avisar enquanto a consulta não volta do worker", async () => {
        const user = userEvent.setup();
        const tela = renderizarComAfd(<EventosAfdView />);
        await tela.carregar(dozeEventos);

        await user.click(screen.getByRole("button", { name: "Próxima" }));

        expect(screen.getByRole("status")).toHaveTextContent("Consultando eventos…");
        await tela.responder();
        expect(screen.queryByText("Consultando eventos…")).not.toBeInTheDocument();
    });
});
