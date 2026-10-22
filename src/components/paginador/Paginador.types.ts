import type { Paginacao } from "../../hooks/usePaginacao";

export interface PaginadorProps {
    /** O objeto devolvido por `usePaginacao` (ou `useConsultaAfd().paginacao`). */
    paginacao: Paginacao;
    /** Total de itens filtrados, para o texto "x de y registros". */
    total: number;
    /** Liga o rótulo ao seletor de tamanho; gerado quando omitido. */
    id?: string;
}
