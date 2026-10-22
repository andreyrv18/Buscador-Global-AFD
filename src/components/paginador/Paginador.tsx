import { useId } from "react";
import Button from "../button/Button";
import Combobox from "../combobox/Combobox";
import { TAMANHOS_PAGINA } from "../../hooks/usePaginacao";
import type { TamanhoPagina } from "../../hooks/usePaginacao";
import type { PaginadorProps } from "./Paginador.types";
import "./Paginador.css";

const OPCOES_TAMANHO = TAMANHOS_PAGINA.map((tamanho) => ({
    value: String(tamanho),
    label: String(tamanho),
}));

const ehTamanhoPagina = (valor: number): valor is TamanhoPagina =>
    TAMANHOS_PAGINA.some((tamanho) => tamanho === valor);

export const Paginador = ({ paginacao, total, id }: PaginadorProps) => {
    const idGerado = useId();
    const idTamanho = id ?? `bga-paginador-${idGerado}`;
    const { pagina, totalPaginas, tamanho, offset, irPara, mudarTamanho } = paginacao;
    const primeiro = total === 0 ? 0 : offset + 1;
    const ultimo = Math.min(offset + tamanho, total);

    return (
        <nav className="bga-paginador" aria-label="Paginação">
            <span className="bga-paginador__contagem">
                {primeiro.toLocaleString("pt-BR")}–{ultimo.toLocaleString("pt-BR")} de{" "}
                {total.toLocaleString("pt-BR")} registros
            </span>
            <div className="bga-paginador__navegacao">
                <Button size="small" variant="filled" disabled={pagina <= 1} onClick={() => irPara(pagina - 1)}>
                    Anterior
                </Button>
                <span className="bga-paginador__pagina" aria-live="polite">
                    Página {pagina.toLocaleString("pt-BR")} de {totalPaginas.toLocaleString("pt-BR")}
                </span>
                <Button size="small" variant="filled" disabled={pagina >= totalPaginas} onClick={() => irPara(pagina + 1)}>
                    Próxima
                </Button>
            </div>
            <div className="bga-paginador__tamanho">
                <Combobox
                    id={idTamanho}
                    label="Itens por página"
                    limpavel={false}
                    options={OPCOES_TAMANHO}
                    value={String(tamanho)}
                    onChange={(valor) => {
                        const novo = Number(valor);
                        if (ehTamanhoPagina(novo)) mudarTamanho(novo);
                    }}
                />
            </div>
        </nav>
    );
};

export default Paginador;
