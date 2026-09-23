export interface ComboboxOption {
    value: string;
    label: string;
}

export interface ComboboxProps {
    label?: string;
    options: ComboboxOption[];
    value?: string;
    onChange: (value: string) => void;
    placeholder?: string;
    error?: string;
    disabled?: boolean;
    className?: string;
}
