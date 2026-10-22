import type { JSX } from "react";

export type NavItemKey =
    | "funcionario"
    | "relogio"
    | "eventos"
    | "marcacoes"
    | "coletor_funcionario"
    | "coletor_matricula"
    | "show_case";

export interface NavSubItem {
    key: NavItemKey;
    label: string;
    icon: JSX.Element;
}

export interface NavGroup {
    groupKey: string;
    groupLabel: string;
    icon: JSX.Element;
    colorVariant: string,
    items: NavSubItem[];
}

export interface NavbarProps {
    activeItem: NavItemKey;
    onSelectItem?: (key: NavItemKey) => void;
}
