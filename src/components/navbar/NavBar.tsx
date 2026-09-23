import "./Navbar.css";
import type { NavbarProps, NavItemKey } from "./Navbar.types";
import { AppIcons } from "../../ultil/DicionariosDeIcones";
import type { JSX } from "react";

const navItems: {
    key: NavItemKey;
    label: string;
    icon: JSX.Element;
}[] = [
        {
            key: "funcionario",
            label: "Funcionários (Tipo 5)",
            icon: <AppIcons.Funcionario />,
        },
        {
            key: "relogio",
            label: "Ajustes Relógio (Tipo 4)",
            icon: <AppIcons.Cargo />,
        },
        {
            key: "eventos",
            label: "Departamento",
            icon: <AppIcons.Departamento />,
        },
        {
            key: "marcacoes",
            label: "Marcações (Tipo 3/7)",
            icon: <AppIcons.Departamento />,
        },
    ];

export const Navbar = ({ activeItem }: NavbarProps) => {
    return (
        <aside className="dixi-navbar" >
            <div className="logo">
                <span>Buscador AFD</span>
            </div>
            <nav className="dixi-navbar__menu">
                {navItems.map(item => (
                    <li
                        key={item.key}
                        className={`dixi-navbar__item ${activeItem === item.key ? "dixi-navbar__item--active" : ""}`}

                    >
                        <span className="dixi-navbar__icon">{item.icon}</span>
                        <span className="dixi-navbar__label">{item.label}</span>
                    </li>
                ))}
            </nav>
        </aside>
    );
};

export default Navbar;
