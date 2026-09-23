import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import Button from './Button';

describe('Componente Button', () => {
    it('deve renderizar o texto recebido em children', () => {
        render(<Button
            type="button"
            variant="outline"
            size="medium">Salvar</Button>);

        expect(screen.getByRole('button')).toHaveTextContent('Salvar')

    });

    it('deve chamar a função onClick quando for clicado', () => {
        const handleOnClick = vi.fn();
        render(<Button onClick={handleOnClick} > Clicar Aqui </Button>);

        fireEvent.click(screen.getByText('Clicar Aqui'));
        expect(handleOnClick).toHaveBeenCalledTimes(1);
    });

    it('deve aplicar a classe css correspondente à variant', () => {
        render(<Button variant="outline" > Fantasma </Button>);
        const btn = screen.getByText('Fantasma').closest('button');
        expect(btn).toHaveClass('btn--outline');
    });

    it('deve desabilitar o botão quando disabled=true', () => {
        render(<Button disabled > Bloqueado </Button>);
        const btn = screen.getByText('Bloqueado').closest('button');
        expect(btn).toBeDisabled();
    });
});