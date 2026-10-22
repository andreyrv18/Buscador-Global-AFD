import { useId } from "react";
import Button from "../../components/button/Button";
import Card from "../../components/card/Card";
import Combobox from "../../components/combobox/Combobox";
import Input from "../../components/input/Input";
import { Paginador } from "../../components/paginador/Paginador";
import { Tabela } from "../../components/tabela/Tabela";
import type { ColunaTabela } from "../../components/tabela/Tabela.types";
import { formatarDataHora } from "../../afd/formatacao";
import type { RegistroTipo4 } from "../../afd/tipos";
import { useConsultaAfd } from "../../hooks/useConsultaAfd";
import { useAfd } from "../../state/useAfd";
import { OPCOES_ORDEM, ROTULO_ORDEM, ehDirecaoOrdem } from "./ordem";
import "./RelogioAfdView.css";

const COLUNAS: ColunaTabela<RegistroTipo4>[] = [
    {
        key: "antes",
        titulo: "Antes",
        render: (ajuste) => (
            <span className="bga-relogio__antes">{formatarDataHora(ajuste.antes)}</span>
        ),
    },
    {
        key: "depois",
        titulo: "Depois",
        render: (ajuste) => (
            <span className="bga-relogio__depois">{formatarDataHora(ajuste.depois)}</span>
        ),
    },
    {
        key: "cpfResponsavel",
        titulo: "CPF do responsável",
        render: (ajuste) =>
            ajuste.cpfResponsavel ?? (
                <span className="bga-relogio__nao-informado">Não informado</span>
            ),
    },
];

const formatarNumero = (valor: number) => valor.toLocaleString("pt-BR");

export const RelogioAfdView = () => {
    const { status, resumo } = useAfd();
    const { itens, total, carregando, erro, paginacao, filtros, exportarCsv, exportando, erroExportacao } = useConsultaAfd("ajustesRelogio");
    const idBase = useId();
    const idData = `${idBase}-data`;

    const pronto = status === "pronto" && resumo !== null;
    const totalArquivo = resumo?.contagemPorTipo["4"] ?? 0;

    return (
        <section data-testid="view-afd-relogio" className="bga-relogio">
            <h2 className="bga-relogio__titulo">Ajustes do relógio</h2>

            {!pronto ? (
                <p className="bga-relogio__aviso" role={status === "lendo" ? "status" : undefined}>
                    {status === "lendo"
                        ? "Lendo o arquivo AFD…"
                        : "Selecione um arquivo AFD acima para ver os ajustes do relógio."}
                </p>
            ) : (
                <Card>
                    <div className="bga-relogio__filtros">
                        <Input
                            id={idData}
                            type="date"
                            label="Data do ajuste (antes)"
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
                        <Button size="small" variant="outline" className="bga-relogio__limpar" onClick={filtros.limpar}>
                            Limpar filtros
                        </Button>
                        <Button
                            size="small"
                            variant="filled"
                            className="bga-relogio__exportar"
                            disabled={exportando || total === 0}
                            onClick={exportarCsv}
                        >
                            {exportando ? "Exportando…" : "Exportar CSV"}
                        </Button>
                    </div>

                    <p className="bga-relogio__contador">
                        {formatarNumero(total)} de {formatarNumero(totalArquivo)} ajustes
                    </p>

                    {carregando && (
                        <p role="status" className="bga-relogio__carregando">
                            Carregando ajustes…
                        </p>
                    )}
                    {erro !== null && (
                        <p role="alert" className="bga-relogio__erro">
                            Não foi possível consultar os ajustes: {erro}
                        </p>
                    )}
                    {erroExportacao !== null && (
                        <p className="bga-relogio__erro" role="alert">
                            {erroExportacao}
                        </p>
                    )}

                    <Tabela
                        colunas={COLUNAS}
                        dados={itens}
                        keyExtractor={(ajuste) => String(ajuste.linha)}
                    />
                    <Paginador paginacao={paginacao} total={total} />
                </Card>
            )}
        </section>
    );
};
