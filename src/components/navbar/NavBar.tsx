import { useState } from "react";
import "./Navbar.css";
import type { NavbarProps } from "./Navbar.types";
import { navGroups } from "./Navbar.data";
import tituloModal from "../../styles/tipografia.module.css";
import tituloDeCampoDeTexto from "../../styles/tipografia.module.css";

export const Navbar = ({ activeItem, onSelectItem }: NavbarProps) => {
    // Inicializa abrindo o grupo que contém o item ativo
    const initialGroup = navGroups.find((group) =>
        group.items.some((item) => item.key === activeItem)
    )?.groupKey || navGroups[0]?.groupKey;

    // Estado agora guarda uma LISTA de chaves de grupos abertos[cite: 5]
    const [openGroups, setOpenGroups] = useState<string[]>(
        initialGroup ? [initialGroup] : []
    );

    // Função Toggle On/Off independente para cada grupo
    const toggleGroup = (groupKey: string) => {
        setOpenGroups((prevGroups) =>
            prevGroups.includes(groupKey)
                ? prevGroups.filter((key) => key !== groupKey) // Se já estava aberto, fecha (Off)
                : [...prevGroups, groupKey]                   // Se estava fechado, abre mantendo os outros (On)
        );
    };

    return (
        <aside className="bga-navbar">
            <div className="bga-navbar__logo">
                <h1 className={`bga-navbar__titulo ${tituloModal}`}>Buscador Global</h1>
            </div>

            <nav className="bga-navbar__menu">
                <ul className="bga-navbar__group-list">
                    {navGroups.map((group) => {
                        // Verifica se o grupo atual está na lista de abertos
                        const isOpen = openGroups.includes(group.groupKey);

                        return (
                            <li key={group.groupKey} className="bga-navbar__group-item" style={{ "--group-color": group.colorVariant } as React.CSSProperties}>
                                <button
                                    type="button"
                                    className={`bga-navbar__group-header ${isOpen ? "bga-navbar__group-header--open" : ""}`}
                                    onClick={() => toggleGroup(group.groupKey)}
                                >
                                    <span className="bga-navbar__icon">{group.icon}</span>
                                    <span className={`bga-navbar__label ${tituloDeCampoDeTexto}`}>
                                        {group.groupLabel}
                                    </span>
                                    <span className="bga-navbar__arrow">{isOpen ? "▲" : "▼"}</span>
                                </button>

                                {isOpen && (
                                    <ul className="bga-navbar__sub-list">
                                        {group.items.map((subItem) => {
                                            const isActive = activeItem === subItem.key;

                                            return (
                                                <li
                                                    key={subItem.key}
                                                    className={`bga-navbar__item ${isActive ? "bga-navbar__item--active" : ""}`}
                                                    onClick={() => onSelectItem?.(subItem.key)}
                                                >
                                                    <span className="bga-navbar__icon">{subItem.icon}</span>
                                                    <span className={`bga-navbar__label ${tituloDeCampoDeTexto}`}>
                                                        {subItem.label}
                                                    </span>
                                                </li>
                                            );
                                        })}
                                    </ul>
                                )}
                            </li>
                        );
                    })}
                </ul>
            </nav>
        </aside>
    );
};

export default Navbar;