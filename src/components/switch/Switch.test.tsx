import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import Switch from './Switch';

describe('Componente Switch', () => {
    it('deve renderizar a label, se providenciada', () => {
        render(<Switch label="Ativar Modo Escuro" />);
        expect(screen.getByText('Ativar Modo Escuro')).toBeInTheDocument();
    });

    it('deve iniciar desmarcado por padrão e marcar ao clicar', () => {
        render(<Switch label="Ligado" />);
        const checkbox = screen.getByRole('checkbox');
        
        expect(checkbox).not.toBeChecked();
        fireEvent.click(checkbox);
        expect(checkbox).toBeChecked();
    });

    it('deve emitir o onChange corretamente', () => {
        const handleChange = vi.fn();
        render(<Switch onChange={handleChange} />);
        
        fireEvent.click(screen.getByRole('checkbox'));
        expect(handleChange).toHaveBeenCalledWith(true);
    });
});