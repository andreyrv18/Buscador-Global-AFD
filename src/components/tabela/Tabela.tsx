import { TabelaProps } from "./Tabela.types";
import "./Tabela.css"

export function Tabela<T>({
    colunas,
    dados,
    keyExtractor,
    onRowClick,
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
                        ))
                    )}
                </tbody>
            </table>
        </div>
    );
}