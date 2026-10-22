// Aba de funcionários (Tipo 5): inclusões, alterações e exclusões de empregado
// no REP. Os registros chegam paginados e filtrados pelo worker.

import { useId, useMemo } from "react";
import Button from "../../components/button/Button";
import Combobox from "../../components/combobox/Combobox";
import Input from "../../components/input/Input";
import { Paginador } from "../../components/paginador/Paginador";
import { Tabela } from "../../components/tabela/Tabela";
import type { ColunaTabela } from "../../components/tabela/Tabela.types";
import { formatarData, formatarHora } from "../../afd/formatacao";
import { DESCRICOES_OPERACOES } from "../../afd/parser";
import type { OperacaoEmpregado, RegistroTipo5 } from "../../afd/tipos";
import { useConsultaAfd } from "../../hooks/useConsultaAfd";
import { useAfd } from "../../state/useAfd";
import { OPCOES_ORDEM, ROTULO_ORDEM, ehDirecaoOrdem } from "./ordem";
import "./FuncionariosAfdView.css";

const OPERACOES: readonly OperacaoEmpregado[] = ["I", "A", "E"];

/** Modificador BEM de cada operação, usado na célula da coluna Operação e no card. */
const MODIFICADOR_OPERACAO: Record<OperacaoEmpregado, string> = {
    I: "inclusao",
    A: "alteracao",
    E: "exclusao",
};

const COLUNAS: ColunaTabela<RegistroTipo5>[] = [
    { key: "data", titulo: "Data", width: "120px", render: (item) => formatarData(item.dataHora.data) },
    { key: "hora", titulo: "Hora", width: "80px", render: (item) => formatarHora(item.dataHora) },
    {
        key: "operacao",
        titulo: "Operação",
        width: "120px",
        // Cor só onde significa: a operação pinta a célula, não a linha inteira.
        render: (item) => (
            <span className={`bga-funcionarios-afd__operacao bga-funcionarios-afd__operacao--${MODIFICADOR_OPERACAO[item.operacao]}`}>
                {DESCRICOES_OPERACOES[item.operacao]}
            </span>
        ),
    },
    { key: "cpfPis", titulo: "CPF/PIS", width: "160px" },
    { key: "nome", titulo: "Colaborador" },
];

const somar = (contagem: Record<OperacaoEmpregado, number> | null | undefined): number =>
    contagem ? contagem.I + contagem.A + contagem.E : 0;

const formatarNumero = (valor: number) => valor.toLocaleString("pt-BR");

interface CardOperacaoProps {
    rotulo: string;
    filtrados: number;
    totalArquivo: number;
    ativo: boolean;
    modificador: string;
    aoClicar: () => void;
}

const CardOperacao = ({ rotulo, filtrados, totalArquivo, ativo, modificador, aoClicar }: CardOperacaoProps) => {
    const classes = [
        "bga-funcionarios-afd__card",
        `bga-funcionarios-afd__card--${modificador}`,
        ativo && "bga-funcionarios-afd__card--ativo",
    ]
        .filter(Boolean)
        .join(" ");

    return (
        <button type="button" className={classes} aria-pressed={ativo} onClick={aoClicar}>
            <span className="bga-funcionarios-afd__card-rotulo">{rotulo}</span>
            <span className="bga-funcionarios-afd__card-valor">{formatarNumero(filtrados)}</span>
            <span className="bga-funcionarios-afd__card-total">de {formatarNumero(totalArquivo)} no arquivo</span>
        </button>
    );
};

export const FuncionariosAfdView = () => {
    const { status, resumo } = useAfd();
    const { itens, total, contagemOperacoes, carregando, erro, paginacao, filtros, exportarCsv, exportando, erroExportacao } = useConsultaAfd("empregados");
    const idBase = useId();

    // Zebra por dia: cada data distinta da página recebe um índice, uma vez só.
    const indicePorData = useMemo(() => {
        const mapa = new Map<string, number>();
        for (const item of itens) {
            if (!mapa.has(item.dataHora.data)) mapa.set(item.dataHora.data, mapa.size);
        }
        return mapa;
    }, [itens]);

    const classeDaLinha = (item: RegistroTipo5) =>
        (indicePorData.get(item.dataHora.data) ?? 0) % 2 === 1
            ? "bga-funcionarios-afd__linha bga-funcionarios-afd__linha--zebra"
            : "bga-funcionarios-afd__linha";

    if (status !== "pronto") {
        return (
            <section className="bga-funcionarios-afd" data-testid="view-afd-funcionarios">
                <h2 className="bga-funcionarios-afd__titulo">Funcionários</h2>
                {/* O erro de leitura já aparece na área de upload, acima das abas. */}
                {status === "lendo" ? (
                    <p className="bga-funcionarios-afd__aviso" role="status">
                        Lendo o arquivo AFD…
                    </p>
                ) : (
                    <p className="bga-funcionarios-afd__aviso">
                        Selecione um arquivo AFD acima para ver as inclusões, alterações e exclusões de
                        funcionários.
                    </p>
                )}
            </section>
        );
    }

    const totaisArquivo = resumo?.contagemOperacoes;
    const { campos } = filtros;

    return (
        <section className="bga-funcionarios-afd" data-testid="view-afd-funcionarios">
            <h2 className="bga-funcionarios-afd__titulo">Funcionários</h2>

            <div className="bga-funcionarios-afd__cards" role="group" aria-label="Filtrar por operação">
                <CardOperacao
                    rotulo="Todas"
                    modificador="todas"
                    filtrados={somar(contagemOperacoes)}
                    totalArquivo={somar(totaisArquivo)}
                    ativo={filtros.operacao === null}
                    aoClicar={() => filtros.mudarOperacao(null)}
                />
                {OPERACOES.map((operacao) => (
                    <CardOperacao
                        key={operacao}
                        rotulo={DESCRICOES_OPERACOES[operacao]}
                        modificador={MODIFICADOR_OPERACAO[operacao]}
                        filtrados={contagemOperacoes?.[operacao] ?? 0}
                        totalArquivo={totaisArquivo?.[operacao] ?? 0}
                        ativo={filtros.operacao === operacao}
                        aoClicar={() => filtros.mudarOperacao(operacao)}
                    />
                ))}
            </div>

            <div className="bga-funcionarios-afd__filtros">
                <Input
                    id={`${idBase}-nome`}
                    label="Nome"
                    type="search"
                    value={campos.nome}
                    onChange={(evento) => filtros.mudarNome(evento.target.value)}
                />
                <Input
                    id={`${idBase}-cpf`}
                    label="CPF/PIS"
                    type="search"
                    inputMode="numeric"
                    value={campos.cpfPis}
                    onChange={(evento) => filtros.mudarCpfPis(evento.target.value)}
                />
                <Input
                    id={`${idBase}-data`}
                    label="Data"
                    type="date"
                    value={campos.data}
                    onChange={(evento) => filtros.mudarData(evento.target.value)}
                />
                <Combobox
                    id={`${idBase}-ordem`}
                    label={ROTULO_ORDEM}
                    limpavel={false}
                    options={OPCOES_ORDEM}
                    value={filtros.ordem}
                    onChange={(valor) => {
                        if (ehDirecaoOrdem(valor)) filtros.mudarOrdem(valor);
                    }}
                />
                <Button size="small" className="bga-funcionarios-afd__limpar" onClick={filtros.limpar}>
                    Limpar filtros
                </Button>
                <Button
                    size="small"
                    variant="filled"
                    className="bga-funcionarios-afd__exportar"
                    disabled={exportando || total === 0}
                    onClick={exportarCsv}
                >
                    {exportando ? "Exportando…" : "Exportar CSV"}
                </Button>
            </div>

            {carregando && (
                <p className="bga-funcionarios-afd__aviso" role="status">
                    Consultando registros…
                </p>
            )}
            {erro !== null && (
                <p className="bga-funcionarios-afd__erro" role="alert">
                    {erro}
                </p>
            )}
            {erroExportacao !== null && (
                <p className="bga-funcionarios-afd__erro" role="alert">
                    {erroExportacao}
                </p>
            )}

            <Tabela
                colunas={COLUNAS}
                dados={itens}
                keyExtractor={(item) => String(item.linha)}
                rowClassName={classeDaLinha}
            />

            <Paginador paginacao={paginacao} total={total} id={`${idBase}-tamanho`} />
        </section>
    );
};
