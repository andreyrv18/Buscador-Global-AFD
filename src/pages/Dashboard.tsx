// src/pages/Dashboard.tsx
import { useState } from "react";
import Navbar from "../components/navbar/NavBar";
import type { NavItemKey } from "../components/navbar/Navbar.types";
import { VIEW_REGISTRY } from "../routes/viewRegistry";
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
                {ActiveViewComponent ? (
                    <ActiveViewComponent />
                ) : (
                    <div>Página em desenvolvimento...</div>
                )}
            </main>
        </div>
    );
};

export default Dashboard;