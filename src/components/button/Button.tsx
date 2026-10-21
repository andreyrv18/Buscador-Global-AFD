import "./Button.css";
import type { ButtonProps } from "./Button.types";

const Button = ({
    children,
    variant = "outline",
    size = "medium",
    icon,
    disabled = false,
    onClick,
    className = "",
    ...rest
}: ButtonProps) => {
    const buttonClasses = [
        "bga-btn",
        `bga-btn--${variant}`,
        `bga-btn--${size}`,
        icon && "bga-btn--with-icon",
        disabled && "bga-btn--disabled",
        className,
    ]
        .filter(Boolean)
        .join(" ");

    return (
        <button
            className={buttonClasses}
            onClick={onClick}
            disabled={disabled}
            {...rest}
        >
            {icon && <span className="bga-btn__icon">{icon}</span>}
            <span className="bga-btn__text">{children}</span>
        </button>
    );
};

export default Button;
