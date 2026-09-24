import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import Navbar from './NavBar';

describe("Componente Navbar", () => {
    it('deve conter os textos das opções de menu', () => {
        render(<Navbar activeItem="funcionario" />);
        
        expect(screen.getByText('Funcionários (Tipo 5)')).toBeInTheDocument();
    });

    it('deve aplicar a classe ativa no item selecionado', () => {
        render(<Navbar activeItem="funcionario" />);
        
        const activeItem = screen.getByText('Funcionários (Tipo 5)').closest('li');
        expect(activeItem).toHaveClass('dixi-navbar__item--active');
        
        const inactiveItem = screen.getByText('Departamento').closest('li');
        expect(inactiveItem).not.toHaveClass('dixi-navbar__item--active');
    });
});