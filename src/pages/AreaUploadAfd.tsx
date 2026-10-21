// Upload do AFD no topo da Dashboard, fora das abas: um arquivo alimenta as quatro views.

import SeletorArquivo from "../components/seletor-arquivo/SeletorArquivo";
import type { RelatorioAfd } from "../afd/tipos";
import { useAfd } from "../state/useAfd";
import "./AreaUploadAfd.css";

const contar = (valor: number, singular: string, plural: string) =>
    `${valor.toLocaleString("pt-BR")} ${valor === 1 ? singular : plural}`;

/** Resumo de uma linha do arquivo lido. */
export function resumirRelatorio(relatorio: RelatorioAfd): string {
    const portaria = relatorio.portaria
        ? `Portaria ${relatorio.portaria}`
        : "Portaria não identificada";
    return [
        portaria,
        contar(relatorio.totalLinhas, "linha lida", "linhas lidas"),
        contar(relatorio.totalLinhasInvalidas, "linha inválida", "linhas inválidas"),
    ].join(" · ");
}

export const AreaUploadAfd = () => {
    const { arquivo, relatorio, status, progresso, erro, carregarArquivo } = useAfd();

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
                {status === "pronto" && relatorio && (
                    <>
                        <span>{resumirRelatorio(relatorio)}</span>
                        {relatorio.leiauteMisto && (
                            <span className="bga-upload-afd__aviso">
                                O arquivo mistura registros da Portaria 671 e do leiaute
                                legado; cada registro foi lido pelo seu leiaute.
                            </span>
                        )}
                    </>
                )}
            </div>

            {status === "erro" && (
                <p className="bga-upload-afd__erro" role="alert">
                    {erro}
                </p>
            )}
        </section>
    );
};

export default AreaUploadAfd;
