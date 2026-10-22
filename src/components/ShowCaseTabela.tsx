import { useState } from "react";
import {Tabela} from "../components/tabela/Tabela";
import type { ColunaTabela } from "../components/tabela/Tabela.types";
import "./tabela/Tabela.css"
interface RegistroAfdMock {
    id: string;
    nsr: string;
    dataHora: string;
    operacao: "Inclusão" | "Alteração" | "Exclusão";
    cpfPis: string;
    detalhes: string;
}

const DADOS_MOCK: RegistroAfdMock[] = [
    {
        id: "1",
        nsr: "000000001",
        dataHora: "28/09/2026 08:30:00",
        operacao: "Inclusão",
        cpfPis: "123.456.789-00",
        detalhes: "Marcação de Ponto Normal",
    },
    {
        id: "2",
        nsr: "000000002",
        dataHora: "28/09/2026 12:00:15",
        operacao: "Alteração",
        cpfPis: "987.654.321-11",
        detalhes: "Ajuste de Horário Manual",
    },
    {
        id: "3",
        nsr: "000000003",
        dataHora: "28/09/2026 18:00:00",
        operacao: "Exclusão",
        cpfPis: "456.789.123-22",
        detalhes: "Marcação Duplicada Removida",
    },
];

export function ShowcaseTabela() {
    const [dados, setDados] = useState<RegistroAfdMock[]>(DADOS_MOCK);

    const colunas: ColunaTabela<RegistroAfdMock>[] = [
        {
            key: "nsr",
            titulo: "NSR",
            width: "120px",
        },
        {
            key: "dataHora",
            titulo: "Data / Hora",
            width: "180px",
        },
        {
            key: "operacao",
            titulo: "Operação",
            width: "120px",
            render: (item) => (
                <span className={`op-${item.operacao.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")}`}>
                    {item.operacao}
                </span>
            ),
        },
        {
            key: "cpfPis",
            titulo: "CPF / PIS",
            width: "160px",
        },
        {
            key: "detalhes",
            titulo: "Detalhes",
        },
        {
            key: "acoes",
            titulo: "Ações",
            align: "center",
            width: "80px",
            render: (item) => (
                <button
                    type="button"
                    className="bga-tabela__btn-icon"
                    onClick={(e) => {
                        e.stopPropagation();
                        console.log("Visualizar NSR:", item.nsr);
                    }}
                >
                    [Ver]
                </button>
            ),
        },
    ];

    return (
        <section style={{ display: "flex", flexDirection: "column", gap: "16px", padding: "16px" }}>
            <div>
                <h3>Showcase - Tabela de Registros AFD</h3>
                <small>Exibição estática com estado em memória</small>
            </div>

            <div style={{ display: "flex", gap: "8px" }}>
                <button type="button" onClick={() => setDados(DADOS_MOCK)}>
                    Carregar Registros ({DADOS_MOCK.length})
                </button>
                <button type="button" onClick={() => setDados([])}>
                    Limpar Registros (0)
                </button>
            </div>

         
            <Tabela<RegistroAfdMock>
                colunas={colunas}
                dados={dados}
                keyExtractor={(item) => item.id}
                onRowClick={(item) => console.log("Linha selecionada:", item.nsr)}
            />
        </section>
    );
}

export default ShowcaseTabela;