import "./Input.css";
import type { InputProps } from "./Input.types";

const Input = ({
    label,
    error,
    icon,
    disabled,
    className = "",
    ...rest
}: InputProps) => {
    const wrapperClasses = [
        "dixi-input",
        error && "dixi-input--error",
        disabled && "dixi-input--disabled",
        className,
    ]
        .filter(Boolean)
        .join(" ");

    return (
        <div className={wrapperClasses}>
            <div className="dixi-input__container">
                {label && <label className="dixi-input__label">{label}</label>}

                <input
                    className="dixi-input__field"
                    disabled={disabled}
                    {...rest}
                />

                {/* Ícone posicionado à direita conforme referência visual */}
                {icon && <span className="dixi-input__icon">{icon}</span>}
            </div>
            {error && <span className="dixi-input__error-msg">{error}</span>}
        </div>
    );
};

export default Input;
