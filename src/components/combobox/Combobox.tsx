import { useState, useRef, useEffect, useId } from "react";
import type { KeyboardEvent, MouseEvent as ReactMouseEvent } from "react";
import "./Combobox.css";
import type { ComboboxProps, ComboboxOption } from "./Combobox.types";
import { AppIcons } from "../../ultil/DicionariosDeIcones.ts";

// Opções renderizadas na lista, na ordem em que aparecem
const listarOpcoes = (lista: HTMLUListElement | null): HTMLLIElement[] =>
    Array.from(lista?.querySelectorAll<HTMLLIElement>('[role="option"]') ?? []);

const Combobox = ({
    id,
    label,
    options,
    value,
    onChange,
    placeholder = "Selecione Um...",
    error,
    disabled = false,
    className = "",
}: ComboboxProps) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const triggerRef = useRef<HTMLButtonElement>(null);
    const listaRef = useRef<HTMLUListElement>(null);

    const idGerado = useId();
    const triggerId = id ?? idGerado;
    const labelId = `${triggerId}-label`;
    const listaId = `${triggerId}-lista`;
    const erroId = `${triggerId}-erro`;

    const selectedOption = options.find(opt => opt.value === value);

    // Fecha o dropdown ao clicar fora do componente
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                containerRef.current &&
                event.target instanceof Node &&
                !containerRef.current.contains(event.target)
            ) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () =>
            document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Ao abrir, leva o foco para a opção selecionada (ou a primeira)
    useEffect(() => {
        if (!isOpen) return;
        const opcoes = listarOpcoes(listaRef.current);
        const selecionada = opcoes.find(op => op.getAttribute("aria-selected") === "true");
        (selecionada ?? opcoes[0])?.focus();
    }, [isOpen]);

    const fechar = () => {
        setIsOpen(false);
        triggerRef.current?.focus();
    };

    const handleToggle = () => {
        if (!disabled) setIsOpen(!isOpen);
    };

    const handleSelect = (option: ComboboxOption) => {
        onChange(option.value);
        fechar();
    };

    const handleClear = (e: ReactMouseEvent) => {
        e.stopPropagation();
        onChange("");
    };

    const handleTriggerKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
        if (disabled) return;
        if (e.key === "ArrowDown" || e.key === "ArrowUp") {
            e.preventDefault();
            setIsOpen(true);
        } else if (e.key === "Escape" && isOpen) {
            e.preventDefault();
            setIsOpen(false);
        }
    };

    const handleOptionKeyDown = (
        e: KeyboardEvent<HTMLLIElement>,
        option: ComboboxOption,
    ) => {
        const opcoes = listarOpcoes(listaRef.current);
        const indiceAtual = opcoes.indexOf(e.currentTarget);

        switch (e.key) {
            case "Enter":
            case " ":
                e.preventDefault();
                handleSelect(option);
                break;
            case "ArrowDown":
                e.preventDefault();
                opcoes[Math.min(indiceAtual + 1, opcoes.length - 1)]?.focus();
                break;
            case "ArrowUp":
                e.preventDefault();
                opcoes[Math.max(indiceAtual - 1, 0)]?.focus();
                break;
            case "Home":
                e.preventDefault();
                opcoes[0]?.focus();
                break;
            case "End":
                e.preventDefault();
                opcoes[opcoes.length - 1]?.focus();
                break;
            case "Escape":
                e.preventDefault();
                fechar();
                break;
            case "Tab":
                setIsOpen(false);
                break;
        }
    };

    const wrapperClasses = [
        "bga-combo",
        isOpen && "bga-combo--open",
        error && "bga-combo--error",
        disabled && "bga-combo--disabled",
        className,
    ]
        .filter(Boolean)
        .join(" ");

    return (
        <div className={wrapperClasses} ref={containerRef}>
            {label && (
                <label id={labelId} className="bga-combo__label" htmlFor={triggerId}>
                    {label}
                </label>
            )}

            {/* O clique em qualquer ponto do campo abre a lista; o teclado usa o botão */}
            <div className="bga-combo__container" onClick={handleToggle}>
                <button
                    ref={triggerRef}
                    id={triggerId}
                    type="button"
                    role="combobox"
                    className="bga-combo__trigger"
                    aria-haspopup="listbox"
                    aria-expanded={isOpen}
                    aria-controls={listaId}
                    aria-labelledby={label ? labelId : undefined}
                    aria-invalid={error ? true : undefined}
                    aria-describedby={error ? erroId : undefined}
                    disabled={disabled}
                    onKeyDown={handleTriggerKeyDown}
                >
                    <span
                        className={`bga-combo__value ${!selectedOption ? "bga-combo__value--placeholder" : ""}`}
                    >
                        {selectedOption ? selectedOption.label : placeholder}
                    </span>
                </button>

                <div className="bga-combo__actions">
                    {selectedOption && !disabled && (
                        <button
                            type="button"
                            className="bga-combo__clear"
                            aria-label="Limpar seleção"
                            onClick={handleClear}
                        >
                            <AppIcons.Fechar aria-hidden="true" />
                        </button>
                    )}
                    <span className="bga-combo__arrow" aria-hidden="true">
                        <AppIcons.Flecha_ordenar />
                    </span>
                </div>
            </div>

            {isOpen && (
                <ul
                    ref={listaRef}
                    id={listaId}
                    role="listbox"
                    className="bga-combo__dropdown"
                    aria-labelledby={label ? labelId : undefined}
                >
                    {options.map(option => {
                        const selecionada = option.value === value;
                        return (
                            <li
                                key={option.value}
                                role="option"
                                tabIndex={-1}
                                aria-selected={selecionada}
                                className={`bga-combo__option ${selecionada ? "bga-combo__option--selected" : ""}`}
                                onClick={() => handleSelect(option)}
                                onKeyDown={e => handleOptionKeyDown(e, option)}
                            >
                                {option.label}
                            </li>
                        );
                    })}
                </ul>
            )}

            {error && (
                <span id={erroId} className="bga-combo__error-msg">
                    {error}
                </span>
            )}
        </div>
    );
};

export default Combobox;
