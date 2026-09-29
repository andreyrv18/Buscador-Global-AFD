import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import Input from './Input';
import userEvent from '@testing-library/user-event';

describe('Componente Input', () => {
    it('deve renderizar a label visualmente', () => {
        render(<Input label="E-mail Corporativo" />);
        expect(screen.getByText('E-mail Corporativo')).toBeInTheDocument();
    });


    it('deve aceitar digitacao', async () => {
        const user = userEvent.setup();
        render(<Input placeholder="Digite algo..." />);

        const input = screen.getByPlaceholderText('Digite algo...');
        await user.type(input, 'Olá, mundo!');

        expect(input).toHaveValue('Olá, mundo!');
    });
    
    it('deve renderizar o erro e aplicar a classe de erro', () => {
        render(<Input error="E-mail inválido" placeholder="Digite seu e-mail" />);

        // Verifica a mensagem visual
        expect(screen.getByText('E-mail inválido')).toBeInTheDocument();

        // Verifica a div envelopadora se aplicou a classe certa
        const inputField = screen.getByPlaceholderText('Digite seu e-mail');
        const wrapper = inputField.closest('.dixi-input');
        expect(wrapper).toHaveClass('dixi-input--error');
    });

    it('deve permitir ser desabilitado', () => {
        render(<Input disabled placeholder="Bloqueado" />);
        expect(screen.getByPlaceholderText('Bloqueado')).toBeDisabled();
    });
});