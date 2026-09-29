// src/components/switch/Switch.test.tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import Switch from './Switch';

describe('Componente Switch', () => {
  it('deve renderizar o switch desmarcado por padrão', () => {
    render(<Switch label="Validar empresa" />);

    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).not.toBeChecked();
    expect(screen.getByText('Validar empresa')).toBeInTheDocument();
  });

  it('deve alternar o estado interno ao clicar quando não for controlado', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();

    render(<Switch label="Notificações" onChange={handleChange} />);

    const labelContainer = screen.getByText('Notificações');
    const checkbox = screen.getByRole('checkbox');

    // Estado inicial
    expect(checkbox).not.toBeChecked();

    // Primeiro clique (Ativa)
    await user.click(labelContainer);
    expect(checkbox).toBeChecked();
    expect(handleChange).toHaveBeenCalledWith(true);

    // Segundo clique (Desativa)
    await user.click(labelContainer);
    expect(checkbox).not.toBeChecked();
    expect(handleChange).toHaveBeenCalledWith(false);
  });

  it('deve respeitar a propriedade defaultChecked', () => {
    render(<Switch label="Opção Padrão" defaultChecked={true} />);

    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).toBeChecked();
  });

  it('deve se comportar de forma controlada quando a prop "checked" for fornecida', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();

    const { rerender } = render(
      <Switch label="Modo Controlado" checked={false} onChange={handleChange} />
    );

    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).not.toBeChecked();

    // Tenta clicar: a callback dispara, mas o estado só muda se a prop mudar externa
    await user.click(checkbox);
    expect(handleChange).toHaveBeenCalledWith(true);
    expect(checkbox).not.toBeChecked(); // Permanece false pois a prop não mudou

    // Rerenderiza simulando o estado do pai
    rerender(<Switch label="Modo Controlado" checked={true} onChange={handleChange} />);
    expect(checkbox).toBeChecked();
  });

  it('não deve disparar eventos nem alterar o estado quando estiver desabilitado', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();

    render(<Switch label="Desabilitado" disabled onChange={handleChange} />);

    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).toBeDisabled();

    await user.click(checkbox);
    expect(handleChange).not.toHaveBeenCalled();
    expect(checkbox).not.toBeChecked();
  });

  it('deve aplicar as classes CSS corretas quando checado e desabilitado', () => {
    const { container } = render(<Switch checked={true} disabled={true} className="custom-class" />);

    const switchLabel = container.querySelector('.bga-switch');
    expect(switchLabel).toHaveClass('bga-switch__checked');
    expect(switchLabel).toHaveClass('bga-switch__disabled');
    expect(switchLabel).toHaveClass('custom-class');
  });
});