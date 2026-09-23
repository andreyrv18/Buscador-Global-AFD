import { useState, useRef, useEffect } from "react";
import "./Combobox.css";
import type { ComboboxProps, ComboboxOption } from "./Combobox.types";
import { AppIcons } from "../../ultil/DicionariosDeIcones.ts";

const Combobox = ({
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

    const selectedOption = options.find(opt => opt.value === value);

    // Lógica para fechar o dropdown ao clicar fora do componente
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                containerRef.current &&
                !containerRef.current.contains(event.target as Node)
            ) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () =>
            document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleToggle = () => {
        if (!disabled) setIsOpen(!isOpen);
    };

    const handleSelect = (option: ComboboxOption) => {
        onChange(option.value);
        setIsOpen(false);
    };

    const handleClear = (e: React.MouseEvent) => {
        e.stopPropagation();
        onChange("");
    };

    const wrapperClasses = [
        "dixi-combo",
        isOpen && "dixi-combo--open",
        error && "dixi-combo--error",
        disabled && "dixi-combo--disabled",
        className,
    ]
        .filter(Boolean)
        .join(" ");

    return (
        <div className={wrapperClasses} ref={containerRef}>
            <div className="dixi-combo__container" onClick={handleToggle}>
                {label && <label className="dixi-combo__label">{label}</label>}

                <span
                    className={`dixi-combo__value ${!selectedOption ? "dixi-combo__placeholder" : ""}`}
                >
                    {selectedOption ? selectedOption.label : placeholder}
                </span>

                <div className="dixi-combo__actions">
                    {selectedOption && !disabled && (
                        <span
                            className="dixi-combo__clear"
                            onClick={handleClear}
                        >
                            <AppIcons.Fechar />
                        </span>
                    )}
                    <svg
                        className="dixi-combo__arrow"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                    >
                        <path d="M7 10l5 5 5-5z" />
                    </svg>
                </div>
            </div>

            {isOpen && (
                <ul className="dixi-combo__dropdown">
                    {options.map(option => (
                        <li
                            key={option.value}
                            className={`dixi-combo__option ${option.value === value ? "dixi-combo__option--selected" : ""}`}
                            onClick={() => handleSelect(option)}
                        >
                            {option.label}
                        </li>
                    ))}
                </ul>
            )}

            {error && <span className="dixi-combo__error-msg">{error}</span>}
        </div>
    );
};

export default Combobox;
