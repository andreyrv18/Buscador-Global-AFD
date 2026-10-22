// src/pages/Dashboard.tsx
import { useState } from "react";
import Navbar from "../components/navbar/NavBar";
import type { NavItemKey } from "../components/navbar/Navbar.types";
import { VIEW_REGISTRY } from "../routes/viewRegistry";
import { AreaUploadAfd } from "./AreaUploadAfd";
import "./Dashboard.css";
export const Dashboard = () => {
    const [activeItem, setActiveItem] = useState<NavItemKey>("funcionario");

    const ActiveViewComponent = VIEW_REGISTRY[activeItem];

    return (
        <div className="bga-dashboard-layout">
            <Navbar
                activeItem={activeItem}
                onSelectItem={(selectedKey) => setActiveItem(selectedKey)}
            />

            <main className="bga-dashboard-content">
                {/* Ilha branca: uma por aba, a tela não rola, só o corpo da tabela */}
                <div className="bga-dashboard-ilha">
                    {/* Fora das abas: o mesmo arquivo alimenta todas as views */}
                    <AreaUploadAfd />

                    {ActiveViewComponent ? (
                        <ActiveViewComponent />
                    ) : (
                        <div>Página em desenvolvimento...</div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default Dashboard;