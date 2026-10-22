import { render, renderHook, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { usePaginacao } from "../../hooks/usePaginacao";
import type { Paginacao } from "../../hooks/usePaginacao";
import { Paginador } from "./Paginador";

function paginacao(parcial: Partial<Paginacao> = {}): Paginacao {
    return {
        pagina: 1,
        tamanho: 10,
        offset: 0,
        limite: 10,
        totalPaginas: 3,
        irPara: vi.fn(),
        mudarTamanho: vi.fn(),
        ...parcial,
    };
}

describe("Paginador", () => {
    it("deve mostrar o intervalo exibido e a página atual", () => {
        render(<Paginador paginacao={paginacao({ pagina: 2, offset: 10 })} total={25} />);

        expect(screen.getByText("11–20 de 25 registros")).toBeInTheDocument();
        expect(screen.getByText("Página 2 de 3")).toBeInTheDocument();
    });

    it("deve mostrar zero registros sem itens", () => {
        render(<Paginador paginacao={paginacao({ totalPaginas: 1 })} total={0} />);

        expect(screen.getByText("0–0 de 0 registros")).toBeInTheDocument();
    });

    it("deve desabilitar Anterior na primeira página e Próxima na última", () => {
        const { rerender } = render(<Paginador paginacao={paginacao()} total={25} />);
        expect(screen.getByRole("button", { name: "Anterior" })).toBeDisabled();
        expect(screen.getByRole("button", { name: "Próxima" })).toBeEnabled();

        rerender(<Paginador paginacao={paginacao({ pagina: 3, offset: 20 })} total={25} />);
        expect(screen.getByRole("button", { name: "Anterior" })).toBeEnabled();
        expect(screen.getByRole("button", { name: "Próxima" })).toBeDisabled();
    });

    it("deve navegar para a página anterior e a seguinte", async () => {
        const user = userEvent.setup();
        const atual = paginacao({ pagina: 2, offset: 10 });
        render(<Paginador paginacao={atual} total={25} />);

        await user.click(screen.getByRole("button", { name: "Próxima" }));
        await user.click(screen.getByRole("button", { name: "Anterior" }));

        expect(atual.irPara).toHaveBeenNthCalledWith(1, 3);
        expect(atual.irPara).toHaveBeenNthCalledWith(2, 1);
    });

    it("deve trocar o tamanho da página", async () => {
        const user = userEvent.setup();
        const { result, rerender } = renderHook(() => usePaginacao(950));
        const { rerender: rerenderTela } = render(<Paginador paginacao={result.current} total={950} />);

        await user.click(screen.getByRole("combobox", { name: "Itens por página" }));
        await user.click(screen.getByRole("option", { name: "100" }));
        rerender();
        rerenderTela(<Paginador paginacao={result.current} total={950} />);

        expect(result.current.tamanho).toBe(100);
        expect(screen.getByText("Página 1 de 10")).toBeInTheDocument();
    });
});
