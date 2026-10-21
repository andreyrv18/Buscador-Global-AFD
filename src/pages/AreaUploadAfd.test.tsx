import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { parsearAfd } from "../afd/parser";
import { AfdProvider } from "../state/AfdContext";
import { fabricaDeWorkersFalsos } from "../state/WorkerAfdFalso";
import { AreaUploadAfd, resumirRelatorio } from "./AreaUploadAfd";

const MARCACAO_LEGADA = "0000000013010120200800123456789012";
const MARCACAO_671 = "0000000023" + "2024-03-06T07:43:00-0300" + "012345678901";

function montar() {
    const fabrica = fabricaDeWorkersFalsos();
    render(
        <AfdProvider criarWorker={fabrica.criarWorker}>
            <AreaUploadAfd />
        </AfdProvider>,
    );
    return fabrica;
}

async function selecionar(nome = "AFD0001.txt") {
    const user = userEvent.setup();
    await user.upload(screen.getByLabelText("Selecionar arquivo"), new File(["x"], nome));
}

describe("AreaUploadAfd", () => {
    it("deve mostrar o seletor sem arquivo antes do upload", () => {
        montar();

        expect(screen.getByLabelText("Selecionar arquivo")).toHaveAttribute("accept", ".txt");
        expect(screen.getByText("Nenhum arquivo selecionado")).toBeInTheDocument();
        expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
    });

    it("deve mostrar o nome do arquivo e o progresso durante a leitura", async () => {
        const { criados } = montar();

        await selecionar();
        act(() => criados[0].progredir(37));

        expect(screen.getByText("AFD0001.txt")).toBeInTheDocument();
        expect(screen.getByRole("progressbar", { name: "Progresso da leitura" })).toHaveValue(37);
        expect(screen.getByRole("status")).toHaveTextContent("Processando arquivo, aguarde. 37%");
    });

    it("deve mostrar o resumo do relatório ao concluir", async () => {
        const { criados } = montar();

        await selecionar();
        act(() => criados[0].concluir(parsearAfd(MARCACAO_LEGADA)));

        expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
        expect(screen.getByRole("status")).toHaveTextContent("Portaria 1510 · 1 linha lida · 0 linhas inválidas");
    });

    it("deve avisar quando o arquivo mistura leiautes", async () => {
        const { criados } = montar();

        await selecionar();
        act(() => criados[0].concluir(parsearAfd([MARCACAO_671, MARCACAO_LEGADA])));

        expect(screen.getByRole("status")).toHaveTextContent(/mistura registros da Portaria 671/);
    });

    it("deve mostrar o erro como alerta", async () => {
        const { criados } = montar();

        await selecionar();
        act(() => criados[0].falhar("script inválido"));

        expect(screen.getByRole("alert")).toHaveTextContent("Falha no processamento do arquivo: script inválido");
    });
});

describe("resumirRelatorio", () => {
    it("deve indicar portaria não identificada e usar o singular", () => {
        const relatorio = parsearAfd("0000000013XXXXXXXX");

        expect(resumirRelatorio(relatorio)).toBe("Portaria não identificada · 1 linha lida · 1 linha inválida");
    });

    it("deve formatar os totais com separador de milhar", () => {
        const relatorio = { ...parsearAfd(MARCACAO_LEGADA), totalLinhas: 171709 };

        expect(resumirRelatorio(relatorio)).toBe("Portaria 1510 · 171.709 linhas lidas · 0 linhas inválidas");
    });
});
