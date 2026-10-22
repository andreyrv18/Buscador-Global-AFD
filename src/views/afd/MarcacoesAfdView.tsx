// Aba de marcações (Tipo 3 e, na Portaria 671, Tipo 7 do REP-P). Os registros
// chegam paginados e filtrados pelo worker; a view só exibe a página.

import { useId, useMemo } from "react";
import Button from "../../components/button/Button";
import Combobox from "../../components/combobox/Combobox";
import Input from "../../components/input/Input";
import { Paginador } from "../../components/paginador/Paginador";
import { Tabela } from "../../components/tabela/Tabela";
import type { ColunaTabela } from "../../components/tabela/Tabela.types";
import { formatarData, formatarHora } from "../../afd/formatacao";
import { DESCRICOES_COLETORES } from "../../afd/parser";
import type { Marcacao } from "../../afd/tipos";
import { useConsultaAfd } from "../../hooks/useConsultaAfd";
import { useAfd } from "../../state/useAfd";
import { OPCOES_ORDEM, ROTULO_ORDEM, ehDirecaoOrdem } from "./ordem";
import "./MarcacoesAfdView.css";

const TRACO = "—";

const formatarNumero = (valor: number) => valor.toLocaleString("pt-BR");

/** Descrição do coletor do Tipo 7; código desconhecido aparece como veio. */
const descreverColetor = (marcacao: Marcacao): string => {
    if (marcacao.tipo !== "7") return TRACO;
    if (marcacao.coletor === "") return "Não informado";
    return DESCRICOES_COLETORES[marcacao.coletor] ?? `Código ${marcacao.coletor}`;
};

const descreverConexao = (marcacao: Marcacao): string => {
    if (marcacao.tipo !== "7") return TRACO;
    if (marcacao.offline === null) return "Não informado";
    return marcacao.offline ? "Off-line" : "On-line";
};

const COLUNAS_BASE: ColunaTabela<Marcacao>[] = [
    { key: "data", titulo: "Data", width: "120px", render: (item) => formatarData(item.dataHora.data) },
    {
        key: "hora",
        titulo: "Hora",
        width: "80px",
        render: (item) => <span className="bga-marcacoes-afd__hora">{formatarHora(item.dataHora)}</span>,
    },
    { key: "nsr", titulo: "NSR", width: "120px" },
    { key: "cpfPis", titulo: "CPF/PIS", width: "160px" },
    { key: "nome", titulo: "Colaborador" },
];

const COLUNAS_REP_P: ColunaTabela<Marcacao>[] = [
    { key: "coletor", titulo: "Coletor", width: "200px", render: descreverColetor },
    { key: "conexao", titulo: "On-line/Off-line", width: "140px", render: descreverConexao },
];

export const MarcacoesAfdView = () => {
    const { status, resumo } = useAfd();
    const { itens, total, carregando, erro, paginacao, filtros, exportarCsv, exportando, erroExportacao } = useConsultaAfd("marcacoes");
    const idBase = useId();

    const totalTipo7 = resumo?.contagemPorTipo["7"] ?? 0;
    const totalArquivo = (resumo?.contagemPorTipo["3"] ?? 0) + totalTipo7;

    // Colunas do REP-P só em arquivo que tem Tipo 7, para não poluir o legado.
    const colunas = useMemo(
        () => (totalTipo7 > 0 ? [...COLUNAS_BASE, ...COLUNAS_REP_P] : COLUNAS_BASE),
        [totalTipo7],
    );

    // Zebra por dia: índice de cada data na ordem em que aparece na página.
    const indicePorData = useMemo(() => {
        const mapa = new Map<string, number>();
        for (const item of itens) {
            if (!mapa.has(item.dataHora.data)) mapa.set(item.dataHora.data, mapa.size);
        }
        return mapa;
    }, [itens]);

    if (status !== "pronto") {
        return (
            <section className="bga-marcacoes-afd" data-testid="view-afd-marcacoes">
                <h2 className="bga-marcacoes-afd__titulo">Marcações</h2>
                {status === "lendo" ? (
                    <p className="bga-marcacoes-afd__aviso" role="status">
                        Lendo o arquivo AFD…
                    </p>
                ) : (
                    <p className="bga-marcacoes-afd__aviso">
                        Selecione um arquivo AFD acima para ver as marcações de ponto.
                    </p>
                )}
            </section>
        );
    }

    const classeLinha = (item: Marcacao) =>
        (indicePorData.get(item.dataHora.data) ?? 0) % 2 === 1
            ? "bga-marcacoes-afd__linha bga-marcacoes-afd__linha--zebra"
            : "bga-marcacoes-afd__linha";

    return (
        <section className="bga-marcacoes-afd" data-testid="view-afd-marcacoes">
            <h2 className="bga-marcacoes-afd__titulo">Marcações</h2>

            <div className="bga-marcacoes-afd__filtros">
                <Input
                    id={`${idBase}-nome`}
                    label="Colaborador"
                    placeholder="Nome do colaborador"
                    value={filtros.campos.nome}
                    onChange={(evento) => filtros.mudarNome(evento.target.value)}
                />
                <Input
                    id={`${idBase}-cpf-pis`}
                    label="CPF/PIS"
                    placeholder="Somente números"
                    inputMode="numeric"
                    value={filtros.campos.cpfPis}
                    onChange={(evento) => filtros.mudarCpfPis(evento.target.value)}
                />
                <Input
                    id={`${idBase}-data`}
                    label="Data"
                    type="date"
                    value={filtros.campos.data}
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
                <div className="bga-marcacoes-afd__limpar">
                    <Button variant="outline" size="small" onClick={filtros.limpar}>
                        Limpar filtros
                    </Button>
                    <Button
                        size="small"
                        variant="filled"
                        disabled={exportando || total === 0}
                        onClick={exportarCsv}
                    >
                        {exportando ? "Exportando…" : "Exportar CSV"}
                    </Button>
                </div>
            </div>

            <p className="bga-marcacoes-afd__contador">
                Total no arquivo: <strong>{formatarNumero(totalArquivo)}</strong> · Encontradas:{" "}
                <strong>{formatarNumero(total)}</strong>
            </p>

            {carregando && (
                <p className="bga-marcacoes-afd__aviso" role="status">
                    Carregando marcações…
                </p>
            )}
            {erro !== null && (
                <p className="bga-marcacoes-afd__erro" role="alert">
                    Não foi possível consultar as marcações: {erro}
                </p>
            )}
            {erroExportacao !== null && (
                <p className="bga-marcacoes-afd__erro" role="alert">
                    {erroExportacao}
                </p>
            )}

            <Tabela
                colunas={colunas}
                dados={itens}
                keyExtractor={(item) => `${item.nsr}-${item.linha}`}
                rowClassName={classeLinha}
            />

            <Paginador paginacao={paginacao} total={total} />
        </section>
    );
};
