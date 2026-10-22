import { useId } from "react";
import type { ChangeEvent } from "react";
import { MdUpload } from "react-icons/md";
import "./SeletorArquivo.css";
import type { SeletorArquivoProps } from "./SeletorArquivo.types";

const SeletorArquivo = ({
    id,
    rotulo,
    accept,
    nomeArquivo = null,
    disabled = false,
    onSelecionar,
}: SeletorArquivoProps) => {
    const idGerado = useId();
    const idInput = id ?? idGerado;

    const aoMudar = (evento: ChangeEvent<HTMLInputElement>) => {
        const arquivo = evento.target.files?.[0];
        // Limpa o valor para que escolher o mesmo arquivo de novo dispare onChange.
        evento.target.value = "";
        if (arquivo) onSelecionar(arquivo);
    };

    const classes = ["bga-seletor-arquivo", disabled && "bga-seletor-arquivo--disabled"]
        .filter(Boolean)
        .join(" ");

    return (
        <div className={classes}>
            {/* Visualmente oculto, mas focável: o teclado chega ao input pelo Tab. */}
            <input
                id={idInput}
                type="file"
                className="bga-seletor-arquivo__input"
                accept={accept}
                disabled={disabled}
                onChange={aoMudar}
            />
            <label htmlFor={idInput} className="bga-seletor-arquivo__botao">
                <MdUpload aria-hidden="true" className="bga-seletor-arquivo__icone" />
                {rotulo}
            </label>
            <span className="bga-seletor-arquivo__nome">
                {nomeArquivo ?? "Nenhum arquivo selecionado"}
            </span>
        </div>
    );
};

export default SeletorArquivo;
