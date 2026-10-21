import { useId } from "react";
import "./Input.css";
import type { InputProps } from "./Input.types";

const Input = ({
    id,
    label,
    error,
    icon,
    disabled,
    className = "",
    ...rest
}: InputProps) => {
    // Usa o id recebido ou gera um único, para ligar <label htmlFor> ao campo
    const idGerado = useId();
    const inputId = id ?? idGerado;
    const erroId = `${inputId}-erro`;

    const wrapperClasses = [
        "bga-input",
        error && "bga-input--error",
        disabled && "bga-input--disabled",
        className,
    ]
        .filter(Boolean)
        .join(" ");

    return (
        <div className={wrapperClasses}>
            <div className="bga-input__container">
                {label && (
                    <label className="bga-input__label" htmlFor={inputId}>
                        {label}
                    </label>
                )}

                <input
                    id={inputId}
                    className="bga-input__field"
                    disabled={disabled}
                    aria-invalid={error ? true : undefined}
                    aria-describedby={error ? erroId : undefined}
                    {...rest}
                />

                {/* Ícone posicionado à direita conforme referência visual */}
                {icon && (
                    <span className="bga-input__icon" aria-hidden="true">
                        {icon}
                    </span>
                )}
            </div>
            {error && (
                <span id={erroId} className="bga-input__error-msg">
                    {error}
                </span>
            )}
        </div>
    );
};

export default Input;
