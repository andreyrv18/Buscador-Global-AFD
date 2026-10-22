export interface SeletorArquivoProps {
    /** Liga o rótulo ao input; gerado quando omitido. */
    id?: string;
    /** Texto do botão. */
    rotulo: string;
    /** Filtro do seletor do sistema, como no atributo `accept`. */
    accept?: string;
    /** Nome exibido ao lado do botão; `null` mostra "Nenhum arquivo selecionado". */
    nomeArquivo?: string | null;
    disabled?: boolean;
    onSelecionar: (arquivo: File) => void;
}
