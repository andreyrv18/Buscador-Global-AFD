// Upload do AFD no topo da Dashboard, fora das abas: um arquivo alimenta as quatro views.

import { useState } from "react";
import Button from "../components/button/Button";
import SeletorArquivo from "../components/seletor-arquivo/SeletorArquivo";
import { ConsultaDescartadaErro } from "../state/AfdContext";
import type { ResumoAfd } from "../afd/tipos";
import { useAfd } from "../state/useAfd";
import { baixarArquivo } from "../ultil/baixarArquivo";
import "./AreaUploadAfd.css";

const contar = (valor: number, singular: string, plural: string) =>
    `${valor.toLocaleString("pt-BR")} ${valor === 1 ? singular : plural}`;

/** Resumo de uma linha do arquivo lido. */
export function resumirRelatorio(resumo: ResumoAfd): string {
    const portaria = resumo.portaria
        ? `Portaria ${resumo.portaria}`
        : "Portaria não identificada";
    return [
        portaria,
        contar(resumo.totalLinhas, "linha lida", "linhas lidas"),
        contar(resumo.totalLinhasInvalidas, "linha inválida", "linhas inválidas"),
    ].join(" · ");
}

export const AreaUploadAfd = () => {
    const { arquivo, resumo, status, progresso, erro, carregarArquivo, exportar } = useAfd();
    const [exportando, setExportando] = useState(false);
    const [erroExportacao, setErroExportacao] = useState<string | null>(null);

    // O relatório inteiro é montado no worker; aqui só chega o arquivo pronto.
    const exportarJson = () => {
        setExportando(true);
        setErroExportacao(null);
        exportar({ formato: "json" })
            .then(baixarArquivo, (motivo: unknown) => {
                // Arquivo trocado no meio da exportação: não há o que baixar nem avisar.
                if (motivo instanceof ConsultaDescartadaErro) return;
                setErroExportacao(motivo instanceof Error ? motivo.message : String(motivo));
            })
            .finally(() => setExportando(false));
    };

    return (
        <section className="bga-upload-afd" aria-labelledby="bga-upload-afd-titulo">
            <h2 id="bga-upload-afd-titulo" className="bga-upload-afd__titulo">
                Arquivo Fonte de Dados (AFD)
            </h2>
            <p className="bga-upload-afd__descricao">
                Selecione o arquivo exportado do REP. Portarias suportadas: 595, 1510 e 671.
            </p>

            <SeletorArquivo
                id="bga-arquivo-afd"
                rotulo="Selecionar arquivo"
                accept=".txt"
                nomeArquivo={arquivo?.name ?? null}
                onSelecionar={carregarArquivo}
            />

            <div className="bga-upload-afd__status" role="status">
                {status === "lendo" && (
                    <>
                        <progress
                            className="bga-upload-afd__progresso"
                            aria-label="Progresso da leitura"
                            max={100}
                            value={progresso}
                        />
                        <span>Processando arquivo, aguarde. {progresso}%</span>
                    </>
                )}
                {status === "pronto" && resumo && (
                    <>
                        <span>{resumirRelatorio(resumo)}</span>
                        {resumo.leiauteMisto && (
                            <span className="bga-upload-afd__aviso">
                                O arquivo mistura registros da Portaria 671 e do leiaute
                                legado; cada registro foi lido pelo seu leiaute.
                            </span>
                        )}
                    </>
                )}
            </div>

            {status === "pronto" && (
                <div className="bga-upload-afd__acoes">
                    <Button size="small" variant="filled" disabled={exportando} onClick={exportarJson}>
                        {exportando ? "Exportando…" : "Exportar relatório (JSON)"}
                    </Button>
                </div>
            )}
            {status === "pronto" && erroExportacao !== null && (
                <p className="bga-upload-afd__erro" role="alert">
                    {erroExportacao}
                </p>
            )}

            {status === "erro" && (
                <p className="bga-upload-afd__erro" role="alert">
                    {erro}
                </p>
            )}
        </section>
    );
};

export default AreaUploadAfd;
