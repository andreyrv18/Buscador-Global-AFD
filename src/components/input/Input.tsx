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
        "bga-input",
        error && "bga-input__error",
        disabled && "bga-input__disabled",
        className,
    ]
        .filter(Boolean)
        .join(" ");

    return (
        <div className={wrapperClasses}>
            <div className="bga-input__container">
                {label && <label className="bga-input__label">{label}</label>}

                <input
                    className="bga-input__field"
                    disabled={disabled}
                    {...rest}
                />

                {/* Ícone posicionado à direita conforme referência visual */}
                {icon && <span className="bga-input__icon">{icon}</span>}
            </div>
            {error && <span className="bga-input__error-msg">{error}</span>}
        </div>
    );
};

export default Input;
