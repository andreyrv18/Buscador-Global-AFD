import "./Tabela.css";
import type { TabelaProps } from "./Tabela.types.ts";

export function Tabela<T>({
    colunas,
    dados,
    keyExtractor,
    onRowClick,
}: TabelaProps<T>) {
    return (
        <table className="dixi-tabela">
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
                {dados.map((item, index) => (
                    <tr
                        key={keyExtractor(item, index)}
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
                                    : (item as any)[col.key]}
                            </td>
                        ))}
                    </tr>
                ))}
            </tbody>
        </table>
    );
}

export default Tabela;
