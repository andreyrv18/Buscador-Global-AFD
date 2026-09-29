import { useState } from "react";
import "./Switch.css";
import type { SwitchProps } from "./Switch.types";


const Switch = ({
    label,
    checked,
    defaultChecked = false,
    onChange,
    disabled = false,
    className = "",
}: SwitchProps) => {
    const [internalChecked, setInternalChecked] = useState(defaultChecked);

    const isControlled = checked !== undefined;
    const currentChecked = isControlled ? checked : internalChecked;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (disabled) return;
        const nextChecked = e.target.checked;
        if (!isControlled) {
            setInternalChecked(nextChecked);
        }
        onChange?.(nextChecked);
    };

    const switchClasses = [
        "bga-switch",
        currentChecked ? "bga-switch__checked" : "",
        disabled ? "bga-switch__disabled" : "",
        className,
    ]
        .filter(Boolean)
        .join(" ");

    return (
        <label className={switchClasses}>
            <input
                type="checkbox"
                checked={currentChecked}
                onChange={handleChange}
                disabled={disabled}
                className="bga-switch__input"
            />
            <span className="bga-switch__track">
                <span className="bga-switch__thumb" />
            </span>
            {label && <span className="bga-switch__label">{label}</span>}
        </label>
    );
};

export default Switch;
