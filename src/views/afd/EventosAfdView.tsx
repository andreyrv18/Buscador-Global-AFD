// Aba Eventos REP (Tipo 6): eventos sensíveis do relógio, com filtro por
// código, data e ordem. Os registros chegam paginados do worker.

import { useId } from "react";
import Button from "../../components/button/Button";
import Card from "../../components/card/Card";
import Combobox from "../../components/combobox/Combobox";
import Input from "../../components/input/Input";
import { Paginador } from "../../components/paginador/Paginador";
import { Tabela } from "../../components/tabela/Tabela";
import type { ColunaTabela } from "../../components/tabela/Tabela.types";
import { formatarDataHora } from "../../afd/formatacao";
import { DESCRICOES_EVENTOS } from "../../afd/parser";
import type { RegistroTipo6 } from "../../afd/tipos";
import { useConsultaAfd } from "../../hooks/useConsultaAfd";
import { useAfd } from "../../state/useAfd";
import { OPCOES_ORDEM, ROTULO_ORDEM, ehDirecaoOrdem } from "./ordem";
import "./EventosAfdView.css";

const OPCOES_CODIGO = Object.entries(DESCRICOES_EVENTOS)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([codigo, descricao]) => ({ value: codigo, label: `${codigo} — ${descricao}` }));

const COLUNAS: ColunaTabela<RegistroTipo6>[] = [
    {
        key: "dataHora",
        titulo: "Data/Hora",
        width: "180px",
        render: (evento) => formatarDataHora(evento.dataHora),
    },
    { key: "codigo", titulo: "Código", width: "100px", align: "center" },
    { key: "descricao", titulo: "Descrição" },
];

const formatarNumero = (valor: number) => valor.toLocaleString("pt-BR");

export const EventosAfdView = () => {
    const { status, resumo } = useAfd();
    const { itens, total, carregando, erro, paginacao, filtros, exportarCsv, exportando, erroExportacao } = useConsultaAfd("eventosRep");
    const idBase = useId();
    const idCodigo = `${idBase}-codigo`;
    const idData = `${idBase}-data`;
    const idOrdem = `${idBase}-ordem`;

    const totalArquivo = resumo?.contagemPorTipo["6"] ?? 0;
    const temFiltro = filtros.codigoEvento !== "" || filtros.campos.data !== "";

    return (
        <section className="bga-eventos" data-testid="view-afd-eventos">
            <header className="bga-eventos__cabecalho">
                <h2 className="bga-eventos__titulo">Eventos do REP</h2>
                <p className="bga-eventos__subtitulo">
                    Eventos sensíveis registrados pelo relógio (registro Tipo 6).
                </p>
            </header>

            {status !== "pronto" ? (
                <p className="bga-eventos__aviso" role={status === "lendo" ? "status" : undefined}>
                    {status === "lendo"
                        ? "Lendo o arquivo AFD…"
                        : "Selecione um arquivo AFD acima para ver os eventos do REP."}
                </p>
            ) : (
                <>
                    <Card title="Filtros">
                        <div className="bga-eventos__filtros">
                            <Combobox
                                id={idCodigo}
                                className="bga-eventos__filtro bga-eventos__filtro--codigo"
                                label="Código do evento"
                                placeholder="Todos os eventos"
                                options={OPCOES_CODIGO}
                                value={filtros.codigoEvento}
                                onChange={filtros.mudarCodigoEvento}
                            />
                            <Input
                                id={idData}
                                className="bga-eventos__filtro"
                                type="date"
                                label="Data"
                                value={filtros.campos.data}
                                onChange={(evento) => filtros.mudarData(evento.target.value)}
                            />
                            <Combobox
                                id={idOrdem}
                                className="bga-eventos__filtro"
                                label={ROTULO_ORDEM}
                                limpavel={false}
                                options={OPCOES_ORDEM}
                                value={filtros.ordem}
                                onChange={(valor) => {
                                    if (ehDirecaoOrdem(valor)) filtros.mudarOrdem(valor);
                                }}
                            />
                            <Button
                                type="button"
                                size="small"
                                className="bga-eventos__limpar"
                                disabled={!temFiltro}
                                onClick={filtros.limpar}
                            >
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
                    </Card>

                    <p className="bga-eventos__contador" aria-live="polite">
                        <strong>{formatarNumero(total)}</strong>{" "}
                        {total === 1 ? "evento encontrado" : "eventos encontrados"} de{" "}
                        <strong>{formatarNumero(totalArquivo)}</strong> no arquivo
                    </p>

                    {carregando && (
                        <p className="bga-eventos__carregando" role="status">
                            Consultando eventos…
                        </p>
                    )}
                    {erro !== null && (
                        <p className="bga-eventos__erro" role="alert">
                            {erro}
                        </p>
                    )}
                    {erroExportacao !== null && (
                        <p className="bga-eventos__erro" role="alert">
                            {erroExportacao}
                        </p>
                    )}

                    <Tabela
                        colunas={COLUNAS}
                        dados={itens}
                        keyExtractor={(evento) => `${evento.linha}-${evento.nsr}`}
                    />

                    <Paginador paginacao={paginacao} total={total} />
                </>
            )}
        </section>
    );
};
