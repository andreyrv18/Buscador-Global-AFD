export interface ComboboxOption {
    value: string;
    label: string;
}

export interface ComboboxProps {
    /** id do campo; se omitido, um id único é gerado */
    id?: string;
    label?: string;
    options: ComboboxOption[];
    value?: string;
    onChange: (value: string) => void;
    placeholder?: string;
    error?: string;
    disabled?: boolean;
    className?: string;
}
