import { useState } from "react";
import type { CSSProperties } from "react";
import "./Navbar.css";
import type { NavbarProps } from "./Navbar.types";
import { navGroups } from "./Navbar.data";
import tipografia from "../../styles/tipografia.module.css";

export const Navbar = ({ activeItem, onSelectItem }: NavbarProps) => {
    // Inicializa abrindo o grupo que contém o item ativo
    const initialGroup = navGroups.find((group) =>
        group.items.some((item) => item.key === activeItem)
    )?.groupKey || navGroups[0]?.groupKey;

    // Lista de chaves dos grupos abertos (vários podem ficar abertos ao mesmo tempo)
    const [openGroups, setOpenGroups] = useState<string[]>(
        initialGroup ? [initialGroup] : []
    );

    // Abre ou fecha um grupo sem afetar os demais
    const toggleGroup = (groupKey: string) => {
        setOpenGroups((prevGroups) =>
            prevGroups.includes(groupKey)
                ? prevGroups.filter((key) => key !== groupKey)
                : [...prevGroups, groupKey]
        );
    };

    return (
        <aside className="bga-navbar">
            <div className="bga-navbar__logo">
                <h1 className={`bga-navbar__titulo ${tipografia.tituloModal}`}>Buscador Global</h1>
            </div>

            <nav className="bga-navbar__menu">
                <ul className="bga-navbar__group-list">
                    {navGroups.map((group) => {
                        const isOpen = openGroups.includes(group.groupKey);
                        const subListId = `bga-navbar-grupo-${group.groupKey}`;
                        // Cor do grupo vem dos dados: valor dinâmico, por isso inline
                        const estiloGrupo = { "--group-color": group.colorVariant } as CSSProperties;

                        return (
                            <li key={group.groupKey} className="bga-navbar__group-item" style={estiloGrupo}>
                                <button
                                    type="button"
                                    className={`bga-navbar__group-header ${isOpen ? "bga-navbar__group-header--open" : ""}`}
                                    aria-expanded={isOpen}
                                    aria-controls={subListId}
                                    onClick={() => toggleGroup(group.groupKey)}
                                >
                                    <span className="bga-navbar__icon" aria-hidden="true">{group.icon}</span>
                                    <span className={`bga-navbar__label ${tipografia.tituloDeCampoDeTexto}`}>
                                        {group.groupLabel}
                                    </span>
                                    <span className="bga-navbar__arrow" aria-hidden="true">{isOpen ? "▲" : "▼"}</span>
                                </button>

                                {isOpen && (
                                    <ul id={subListId} className="bga-navbar__sub-list">
                                        {group.items.map((subItem) => {
                                            const isActive = activeItem === subItem.key;

                                            return (
                                                <li key={subItem.key} className="bga-navbar__sub-item">
                                                    <button
                                                        type="button"
                                                        className={`bga-navbar__item ${isActive ? "bga-navbar__item--active" : ""}`}
                                                        aria-current={isActive ? "page" : undefined}
                                                        onClick={() => onSelectItem?.(subItem.key)}
                                                    >
                                                        <span className="bga-navbar__icon" aria-hidden="true">{subItem.icon}</span>
                                                        <span className={`bga-navbar__label ${tipografia.tituloDeCampoDeTexto}`}>
                                                            {subItem.label}
                                                        </span>
                                                    </button>
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
