import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import SeletorArquivo from "./SeletorArquivo";

const arquivo = new File(["0000000013"], "AFD0001.txt", { type: "text/plain" });

describe("SeletorArquivo", () => {
    it("deve ligar o rótulo ao campo de arquivo", () => {
        render(<SeletorArquivo rotulo="Selecionar arquivo" onSelecionar={() => {}} />);

        const campo = screen.getByLabelText("Selecionar arquivo");

        expect(campo).toHaveAttribute("type", "file");
    });

    it("deve usar o id informado", () => {
        render(<SeletorArquivo id="arquivo-afd" rotulo="Selecionar" onSelecionar={() => {}} />);

        expect(screen.getByLabelText("Selecionar")).toHaveAttribute("id", "arquivo-afd");
    });

    it("deve repassar o filtro de extensão", () => {
        render(<SeletorArquivo rotulo="Selecionar" accept=".txt" onSelecionar={() => {}} />);

        expect(screen.getByLabelText("Selecionar")).toHaveAttribute("accept", ".txt");
    });

    it("deve chamar onSelecionar com o arquivo escolhido", async () => {
        const user = userEvent.setup();
        const onSelecionar = vi.fn();
        render(<SeletorArquivo rotulo="Selecionar" onSelecionar={onSelecionar} />);

        await user.upload(screen.getByLabelText("Selecionar"), arquivo);

        expect(onSelecionar).toHaveBeenCalledExactlyOnceWith(arquivo);
    });

    it("deve permitir escolher o mesmo arquivo duas vezes seguidas", async () => {
        const user = userEvent.setup();
        const onSelecionar = vi.fn();
        render(<SeletorArquivo rotulo="Selecionar" onSelecionar={onSelecionar} />);
        const campo = screen.getByLabelText("Selecionar");

        await user.upload(campo, arquivo);
        await user.upload(campo, arquivo);

        expect(onSelecionar).toHaveBeenCalledTimes(2);
    });

    it("deve mostrar o nome do arquivo ou o aviso de nenhum selecionado", () => {
        const { rerender } = render(<SeletorArquivo rotulo="Selecionar" onSelecionar={() => {}} />);
        expect(screen.getByText("Nenhum arquivo selecionado")).toBeInTheDocument();

        rerender(<SeletorArquivo rotulo="Selecionar" nomeArquivo="AFD0001.txt" onSelecionar={() => {}} />);

        expect(screen.getByText("AFD0001.txt")).toBeInTheDocument();
    });

    it("deve não chamar onSelecionar quando desabilitado", async () => {
        const user = userEvent.setup();
        const onSelecionar = vi.fn();
        render(<SeletorArquivo rotulo="Selecionar" disabled onSelecionar={onSelecionar} />);

        await user.upload(screen.getByLabelText("Selecionar"), arquivo);

        expect(screen.getByLabelText("Selecionar")).toBeDisabled();
        expect(onSelecionar).not.toHaveBeenCalled();
    });
});
