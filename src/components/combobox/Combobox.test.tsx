import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import Combobox from './Combobox';

const mockOptions = [
    { label: 'Opção 1', value: '1' },
    { label: 'Opção 2', value: '2' },
];

describe('Componente Combobox', () => {
    it('deve renderizar o placeholder e a label iniciais', () => {
        render(<Combobox options={mockOptions} value="" onChange={() => {}} label="Escolha" placeholder="Selecione algo" />);
        expect(screen.getByText('Escolha')).toBeInTheDocument();
        expect(screen.getByText('Selecione algo')).toBeInTheDocument();
    });

    it('deve exibir a opção selecionada', () => {
        render(<Combobox options={mockOptions} value="2" onChange={() => {}} />);
        expect(screen.getByText('Opção 2')).toBeInTheDocument();
    });

    it('deve abrir o dropdown ao clicar e emitir onChange ao selecionar', () => {
        const handleChange = vi.fn();
        render(<Combobox options={mockOptions} value="" onChange={handleChange} />);
        
        // Abre o dropdown clicando no container
        const container = screen.getByText('Selecione Um...').closest('.dixi-combo__container') as HTMLElement;
        fireEvent.click(container);
        
        // Clica na opção
        const option = screen.getByText('Opção 1');
        expect(option).toBeInTheDocument();
        fireEvent.click(option);
        
        // Verifica se a função foi chamada com o valor certo
        expect(handleChange).toHaveBeenCalledWith('1');
    });

    it('deve exibir erro se providenciado', () => {
        render(<Combobox options={mockOptions} value="" onChange={() => {}} error="Campo obrigatório" />);
        expect(screen.getByText('Campo obrigatório')).toBeInTheDocument();
    });
});
