import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import Button from './Button';

describe('Componente Button', () => {
  it('deve renderizar o texto recebido em children', () => {
    render(
      <Button type="button" variant="outline" size="medium">
        Salvar
      </Button>
    );

    expect(screen.getByRole('button', { name: /salvar/i })).toHaveTextContent('Salvar');
  });

  it('deve chamar a função onClick quando for clicado', async () => {
    const user = userEvent.setup();
    const handleOnClick = vi.fn();

    render(<Button onClick={handleOnClick}>Clicar Aqui</Button>);

    await user.click(screen.getByRole('button', { name: /clicar aqui/i }));
    expect(handleOnClick).toHaveBeenCalledTimes(1);
  });

  it('deve aplicar a classe css correspondente à variant', () => {
    render(<Button variant="outline">Fantasma</Button>);

    const button = screen.getByRole('button', { name: /fantasma/i });
    expect(button).toHaveClass('bga-btn__outline');
  });

  it('deve desabilitar o botão quando disabled=true', () => {
    render(<Button disabled>Bloqueado</Button>);

    const button = screen.getByRole('button', { name: /bloqueado/i });
    expect(button).toBeDisabled();
  });
});