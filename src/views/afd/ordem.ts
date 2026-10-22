// Opções de ordem comuns às abas do AFD, para que as quatro falem igual.

import type { ComboboxOption } from "../../components/combobox/Combobox.types";
import type { DirecaoOrdem } from "../../hooks/useFiltrosAfd";

export const ROTULO_ORDEM = "Ordem";

export const OPCOES_ORDEM: ComboboxOption[] = [
    { value: "asc", label: "Data crescente" },
    { value: "desc", label: "Data decrescente" },
];

/** O Combobox emite `""` ao limpar a seleção; esse valor não muda a ordem. */
export const ehDirecaoOrdem = (valor: string): valor is DirecaoOrdem => valor === "asc" || valor === "desc";
