import React from "react";

export type ButtonVariant = "outline" | "filled";
export type ButtonSize = "small" | "medium";

export interface ButtonProps extends Omit<
    React.ButtonHTMLAttributes<HTMLButtonElement>,
    "size"
> {
    variant?: ButtonVariant;
    size?: ButtonSize;
    icon?: React.ReactNode;
    children: React.ReactNode;
}
