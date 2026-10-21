import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import Input from './Input';
import userEvent from '@testing-library/user-event';

describe('Componente Input', () => {
    it('deve ligar a label ao campo', () => {
        render(<Input label="E-mail Corporativo" />);
        expect(screen.getByLabelText('E-mail Corporativo')).toBeInstanceOf(HTMLInputElement);
    });

    it('deve respeitar o id recebido por prop', () => {
        render(<Input id="campo-cpf" label="CPF" />);
        expect(screen.getByLabelText('CPF')).toHaveAttribute('id', 'campo-cpf');
    });

    it('deve gerar ids distintos para campos diferentes', () => {
        render(
            <>
                <Input label="Nome" />
                <Input label="CPF" />
            </>
        );
        expect(screen.getByLabelText('Nome').id).not.toBe(screen.getByLabelText('CPF').id);
    });

    it('deve aceitar digitacao', async () => {
        const user = userEvent.setup();
        render(<Input label="Busca" placeholder="Digite algo..." />);

        const input = screen.getByLabelText('Busca');
        await user.type(input, 'Olá, mundo!');

        expect(input).toHaveValue('Olá, mundo!');
    });

    it('deve renderizar o erro, associá-lo ao campo e aplicar o modificador de erro', () => {
        render(<Input label="E-mail" error="E-mail inválido" />);

        const campo = screen.getByLabelText('E-mail');
        expect(campo).toHaveAttribute('aria-invalid', 'true');
        expect(campo).toHaveAccessibleDescription('E-mail inválido');
        expect(campo.closest('.bga-input')).toHaveClass('bga-input--error');
    });

    it('deve permitir ser desabilitado', () => {
        render(<Input label="Bloqueado" disabled />);
        const campo = screen.getByLabelText('Bloqueado');
        expect(campo).toBeDisabled();
        expect(campo.closest('.bga-input')).toHaveClass('bga-input--disabled');
    });
});
