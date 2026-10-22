import type { ReactNode } from "react";
import type { TabelaProps } from "./Tabela.types";
import "./Tabela.css";

/**
 * Lê o campo `chave` do item quando a coluna não define `render`.
 * Só exibe texto e número: qualquer outro valor exige um `render` explícito.
 */
const lerCampo = (item: unknown, chave: string): ReactNode => {
    if (typeof item !== "object" || item === null) return null;
    const valor: unknown = Reflect.get(item, chave);
    return typeof valor === "string" || typeof valor === "number" ? valor : null;
};

export function Tabela<T>({
    colunas,
    dados,
    keyExtractor,
    onRowClick,
    rowClassName,
}: TabelaProps<T>) {
    return (
        <div className="bga-tabela-container">
            <table className="bga-tabela">
                <thead>
                    <tr>
                        {colunas.map(col => (
                            <th
                                key={col.key}
                                style={{
                                    width: col.width,
                                    textAlign: col.align || "left",
                                }}
                            >
                                {col.titulo}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {dados.length === 0 ? (
                        <tr>
                            <td colSpan={colunas.length} className="bga-tabela__vazio">
                                Nenhum registro encontrado.
                            </td>
                        </tr>
                    ) : (
                        dados.map((item, index) => (
                            <tr
                                key={keyExtractor(item, index)}
                                className={rowClassName?.(item, index)}
                                onClick={() => onRowClick && onRowClick(item)}
                                style={{ cursor: onRowClick ? "pointer" : "default" }}
                            >
                                {colunas.map(col => (
                                    <td
                                        key={col.key}
                                        style={{ textAlign: col.align || "left" }}
                                    >
                                        {col.render
                                            ? col.render(item, index)
                                            : lerCampo(item, col.key)}
                                    </td>
                                ))}
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
    );
}
