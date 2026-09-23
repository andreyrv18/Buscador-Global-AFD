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
        "btn",
        `btn--${variant}`,
        `btn--${size}`,
        icon && "btn--with-icon",
        disabled && "btn--disabled",
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
            {icon && <span className="btn__icon">{icon}</span>}
            <span className="btn__text">{children}</span>
        </button>
    );
};

export default Button;
