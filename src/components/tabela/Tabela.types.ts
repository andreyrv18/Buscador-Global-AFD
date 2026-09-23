export interface ColunaTabela<T> {
    key: string;
    titulo: string;
    width?: string;
    align?: "left" | "center" | "right";
    render?: (item: T, index: number) => React.ReactNode;
}

export interface TabelaProps<T> {
    colunas: ColunaTabela<T>[];
    dados: T[];
    keyExtractor: (item: T, index: number) => string;
    onRowClick?: (item: T) => void;
}
