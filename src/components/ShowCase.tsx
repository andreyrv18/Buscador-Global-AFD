import { useState } from "react";
import Button from "../components/button/Button";
import Input from "../components/input/Input";
import Combobox from "../components/combobox/Combobox";
import Switch from "../components/switch/Switch";
import { AppIcons } from "../ultil/DicionariosDeIcones";

const sampleOptions = [
    { value: "1", label: "Opção 1" },
    { value: "2", label: "Opção 2" },
    { value: "3", label: "Opção 3" },
    { value: "4", label: "Opção 4" },
    { value: "5", label: "Opção 5" },
];

const Showcase = () => {
    // Estados para testes interativos
    const [inputText, setInputText] = useState("Super Texto");
    const [comboValue, setComboValue] = useState("1");
    const [comboInteractive, setComboInteractive] = useState("");
    const [switchState, setSwitchState] = useState(true);

    return (
        <div style={{ padding: "32px", maxWidth: "1200px", margin: "0 auto" }}>
            <h1 style={{ color: "var(--azul-base)", marginBottom: "32px" }}>
                Showcase de Componentes - Regras de UI Dixi
            </h1>

            {/* ================= 1. BOTÕES ================= */}
            <section style={{ marginBottom: "48px" }}>
                <h2
                    style={{
                        borderBottom: "2px solid var(--outline)",
                        paddingBottom: "8px",
                        color: "var(--texto-destaque)",
                    }}
                >
                    1. Botão
                </h2>

                <div
                    style={{ display: "grid", gap: "24px", marginTop: "16px" }}
                >
                    <div>
                        <h3
                            style={{
                                color: "var(--corpo-de-texto)",
                                fontSize: "14px",
                            }}
                        >
                            Botão Pequeno
                        </h3>
                        <div
                            style={{
                                display: "flex",
                                gap: "12px",
                                alignItems: "center",
                                flexWrap: "wrap",
                            }}
                        >
                            <Button size="small" variant="outline">
                                Texto Botão
                            </Button>
                            <Button size="small" variant="filled">
                                Texto Botão
                            </Button>
                            <Button size="small" variant="outline" disabled>
                                Desabilitado
                            </Button>
                        </div>
                    </div>

                    <div>
                        <h3
                            style={{
                                color: "var(--corpo-de-texto)",
                                fontSize: "14px",
                            }}
                        >
                            Botão Médio (Normal)
                        </h3>
                        <div
                            style={{
                                display: "flex",
                                gap: "12px",
                                alignItems: "center",
                                flexWrap: "wrap",
                            }}
                        >
                            <Button size="medium" variant="outline">
                                Texto Botão
                            </Button>
                            <Button size="medium" variant="filled">
                                Texto Botão
                            </Button>
                            <Button size="medium" variant="outline" disabled>
                                Desabilitado
                            </Button>
                        </div>
                    </div>

                    <div>
                        <h3
                            style={{
                                color: "var(--corpo-de-texto)",
                                fontSize: "14px",
                            }}
                        >
                            Botão Médio (Com Ícone)
                        </h3>
                        <div
                            style={{
                                display: "flex",
                                gap: "12px",
                                alignItems: "center",
                                flexWrap: "wrap",
                            }}
                        >
                            <Button
                                size="medium"
                                variant="outline"
                                icon={<AppIcons.Adicionar />}
                            >
                                Texto Botão
                            </Button>
                            <Button
                                size="medium"
                                variant="filled"
                                icon={<AppIcons.Adicionar />}
                            >
                                Texto Botão
                            </Button>
                            <Button
                                size="medium"
                                variant="filled"
                                icon={<AppIcons.Salvar />}
                                disabled
                            >
                                Desabilitado
                            </Button>
                        </div>
                    </div>
                </div>
            </section>

            {/* ================= 2. SWITCH ================= */}
            <section style={{ marginBottom: "48px" }}>
                <h2
                    style={{
                        borderBottom: "2px solid var(--outline)",
                        paddingBottom: "8px",
                        color: "var(--texto-destaque)",
                    }}
                >
                    2. Switch
                </h2>

                <div
                    style={{
                        display: "flex",
                        gap: "32px",
                        marginTop: "16px",
                        flexWrap: "wrap",
                    }}
                >
                    <div>
                        <h3
                            style={{
                                color: "var(--corpo-de-texto)",
                                fontSize: "14px",
                            }}
                        >
                            Não Selecionado
                        </h3>
                        <Switch
                            label="Validar empresa"
                            defaultChecked={false}
                        />
                    </div>

                    <div>
                        <h3
                            style={{
                                color: "var(--corpo-de-texto)",
                                fontSize: "14px",
                            }}
                        >
                            Selecionado (Interativo)
                        </h3>
                        <Switch
                            label="Validar empresa"
                            checked={switchState}
                            onChange={setSwitchState}
                        />
                    </div>

                    <div>
                        <h3
                            style={{
                                color: "var(--corpo-de-texto)",
                                fontSize: "14px",
                            }}
                        >
                            Desabilitados
                        </h3>
                        <div style={{ display: "flex", gap: "16px" }}>
                            <Switch
                                label="Off"
                                defaultChecked={false}
                                disabled
                            />
                            <Switch label="On" defaultChecked={true} disabled />
                        </div>
                    </div>
                </div>
            </section>

            {/* ================= 3. CAMPOS DE TEXTO & DROPDOWN ================= */}
            <section style={{ marginBottom: "48px" }}>
                <h2
                    style={{
                        borderBottom: "2px solid var(--outline)",
                        paddingBottom: "8px",
                        color: "var(--texto-destaque)",
                    }}
                >
                    3. Campos de Texto & Dropdown
                </h2>

                <div
                    style={{
                        display: "grid",
                        gridTemplateColumns:
                            "repeat(auto-fit, minmax(320px, 1fr))",
                        gap: "24px",
                        marginTop: "16px",
                    }}
                >
                    {/* COLUNA 1: INPUT NORMAL */}
                    <div
                        style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: "16px",
                        }}
                    >
                        <h3 style={{ color: "var(--azul-base)" }}>
                            Campo Normal
                        </h3>

                        <Input
                            label="Título do Campo"
                            placeholder="Escreva algo"
                        />

                        <Input
                            label="Título do Campo"
                            value={inputText}
                            onChange={e => setInputText(e.target.value)}
                        />

                        <Input
                            label="Título do Campo"
                            placeholder="Escreva algo"
                            error="*mensagem de erro."
                        />

                        <Input
                            label="Título do Campo"
                            value="Super Texto"
                            error="*mensagem de erro."
                        />

                        <Input
                            label="Título do Campo"
                            placeholder="Escreva algo"
                            disabled
                        />

                        <Input
                            label="Título do Campo"
                            value="Super Texto"
                            disabled
                        />
                    </div>

                    {/* COLUNA 2: INPUT COM ÍCONE */}
                    <div
                        style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: "16px",
                        }}
                    >
                        <h3 style={{ color: "var(--azul-base)" }}>
                            Campo com Ícone
                        </h3>

                        <Input
                            label="Título do Campo"
                            placeholder="00/00/00"
                            icon={<AppIcons.Calendario />}
                        />

                        <Input
                            label="Título do Campo"
                            value="27/07/25"
                            icon={<AppIcons.Calendario />}
                        />

                        <Input
                            label="Título do Campo"
                            placeholder="00/00/00"
                            icon={<AppIcons.Calendario />}
                            error="*mensagem de erro."
                        />

                        <Input
                            label="Título do Campo"
                            value="27/07/25"
                            icon={<AppIcons.Calendario />}
                            error="*mensagem de erro."
                        />

                        <Input
                            label="Título do Campo"
                            placeholder="00/00/00"
                            icon={<AppIcons.Calendario />}
                            disabled
                        />

                        <Input
                            label="Título do Campo"
                            value="27/07/25"
                            icon={<AppIcons.Calendario />}
                            disabled
                        />
                    </div>

                    {/* COLUNA 3: DROPDOWN (COMBOBOX) */}
                    <div
                        style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: "16px",
                        }}
                    >
                        <h3 style={{ color: "var(--azul-base)" }}>
                            Dropdown (Combobox)
                        </h3>

                        <Combobox
                            label="Título De Campo"
                            options={sampleOptions}
                            value={comboInteractive}
                            onChange={setComboInteractive}
                            placeholder="Selecione Um..."
                        />

                        <Combobox
                            label="Título De Campo"
                            options={sampleOptions}
                            value={comboValue}
                            onChange={setComboValue}
                        />

                        <Combobox
                            label="Título De Campo"
                            options={sampleOptions}
                            value=""
                            onChange={() => {}}
                            error="* Obrigatório"
                        />

                        <Combobox
                            label="Título De Campo"
                            options={sampleOptions}
                            value=""
                            onChange={() => {}}
                            disabled
                        />
                    </div>
                </div>
            </section>
        </div>
    );
};

export default Showcase;
