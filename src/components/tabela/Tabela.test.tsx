import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { Tabela } from "./Tabela";
import type { ColunaTabela } from "./Tabela.types";

// Interface dummy para os testes
interface ItemExemplo {
    id: string;
    nsr: string;
    dataHora: string;
    cpfPis: string;
}

// Dados mockados
const MOCK_DADOS: ItemExemplo[] = [
    { id: "1", nsr: "000000001", dataHora: "28/09/2026 08:30", cpfPis: "123.456.789-00" },
    { id: "2", nsr: "000000002", dataHora: "28/09/2026 12:00", cpfPis: "987.654.321-11" },
];

// Colunas padrão para os testes
const MOCK_COLUNAS: ColunaTabela<ItemExemplo>[] = [
    { key: "nsr", titulo: "NSR", width: "100px", align: "center" },
    { key: "dataHora", titulo: "Data/Hora", width: "150px" },
    { key: "cpfPis", titulo: "CPF/PIS", align: "right" },
];

describe("Componente Tabela (Unidade e Integração)", () => {
    it("deve renderizar os cabeçalhos das colunas corretamente", () => {
        render(
            <Tabela<ItemExemplo>
                colunas={MOCK_COLUNAS}
                dados={MOCK_DADOS}
                keyExtractor={(item) => item.id}
            />
        );

        expect(screen.getByText("NSR")).toBeInTheDocument();
        expect(screen.getByText("Data/Hora")).toBeInTheDocument();
        expect(screen.getByText("CPF/PIS")).toBeInTheDocument();
    });

    it("deve renderizar os dados das linhas nas células correspondentes", () => {
        render(
            <Tabela<ItemExemplo>
                colunas={MOCK_COLUNAS}
                dados={MOCK_DADOS}
                keyExtractor={(item) => item.id}
            />
        );

        expect(screen.getByText("000000001")).toBeInTheDocument();
        expect(screen.getByText("28/09/2026 08:30")).toBeInTheDocument();
        expect(screen.getByText("123.456.789-00")).toBeInTheDocument();

        expect(screen.getByText("000000002")).toBeInTheDocument();
        expect(screen.getByText("28/09/2026 12:00")).toBeInTheDocument();
        expect(screen.getByText("987.654.321-11")).toBeInTheDocument();
    });

    it("deve exibir a mensagem de estado vazio quando não houver dados", () => {
        render(
            <Tabela<ItemExemplo>
                colunas={MOCK_COLUNAS}
                dados={[]}
                keyExtractor={(item) => item.id}
            />
        );

        const mensagemVazia = screen.getByText("Nenhum registro encontrado.");
        expect(mensagemVazia).toBeInTheDocument();
        
        // Verifica se a célula do estado vazio possui o colSpan equivalente ao total de colunas
        expect(mensagemVazia.closest("td")).toHaveAttribute("colSpan", String(MOCK_COLUNAS.length));
    });

    it("deve renderizar um conteúdo customizado quando a propriedade render for informada na coluna", () => {
        const colunasComRender: ColunaTabela<ItemExemplo>[] = [
            ...MOCK_COLUNAS,
            {
                key: "acoes",
                titulo: "Ações",
                render: (item) => (
                    <button data-testid={`btn-ver-${item.id}`}>
                        Ver {item.nsr}
                    </button>
                ),
            },
        ];

        render(
            <Tabela<ItemExemplo>
                colunas={colunasComRender}
                dados={MOCK_DADOS}
                keyExtractor={(item) => item.id}
            />
        );

        expect(screen.getByTestId("btn-ver-1")).toBeInTheDocument();
        expect(screen.getByTestId("btn-ver-2")).toBeInTheDocument();
    });

    it("deve chamar a callback onRowClick passando os dados do item ao clicar na linha", async () => {
        const handleRowClick = vi.fn();
        const user = userEvent.setup();

        render(
            <Tabela<ItemExemplo>
                colunas={MOCK_COLUNAS}
                dados={MOCK_DADOS}
                keyExtractor={(item) => item.id}
                onRowClick={handleRowClick}
            />
        );

        await user.click(screen.getByRole("row", { name: /000000001/ }));

        expect(handleRowClick).toHaveBeenCalledTimes(1);
        expect(handleRowClick).toHaveBeenCalledWith(MOCK_DADOS[0]);
    });

    it("deve exibir campos numéricos e omitir valores que não sejam texto ou número", () => {
        interface ItemMisto {
            id: string;
            total: number;
            detalhe: { interno: string };
        }
        const colunas: ColunaTabela<ItemMisto>[] = [
            { key: "total", titulo: "Total" },
            { key: "detalhe", titulo: "Detalhe" },
            { key: "inexistente", titulo: "Inexistente" },
        ];

        render(
            <Tabela<ItemMisto>
                colunas={colunas}
                dados={[{ id: "1", total: 42, detalhe: { interno: "x" } }]}
                keyExtractor={(item) => item.id}
            />
        );

        const celulas = screen.getAllByRole("cell");
        expect(celulas.map((celula) => celula.textContent)).toEqual(["42", "", ""]);
    });

    it("deve aplicar o cursor correto na linha dependendo da prop onRowClick", () => {
        const { rerender } = render(
            <Tabela<ItemExemplo>
                colunas={MOCK_COLUNAS}
                dados={MOCK_DADOS}
                keyExtractor={(item) => item.id}
            />
        );

        let primeiraLinha = screen.getByText("000000001").closest("tr");
        expect(primeiraLinha).toHaveStyle({ cursor: "default" });

        rerender(
            <Tabela<ItemExemplo>
                colunas={MOCK_COLUNAS}
                dados={MOCK_DADOS}
                keyExtractor={(item) => item.id}
                onRowClick={() => {}}
            />
        );

        primeiraLinha = screen.getByText("000000001").closest("tr");
        expect(primeiraLinha).toHaveStyle({ cursor: "pointer" });
    });

    it("deve aplicar a classe que rowClassName devolve para cada linha", () => {
        render(
            <Tabela<ItemExemplo>
                colunas={MOCK_COLUNAS}
                dados={MOCK_DADOS}
                keyExtractor={(item) => item.id}
                rowClassName={(item, index) => (index === 1 ? `linha-${item.id}` : undefined)}
            />
        );

        expect(screen.getByText("000000001").closest("tr")).not.toHaveAttribute("class");
        expect(screen.getByText("000000002").closest("tr")).toHaveClass("linha-2");
    });
});