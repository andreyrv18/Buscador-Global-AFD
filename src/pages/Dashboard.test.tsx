import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect } from 'vitest';
import Dashboard from './Dashboard';
import { VIEW_REGISTRY } from '../routes/viewRegistry';

describe('Componente Dashboard (Integração sem Mocks)', () => {
  it('deve renderizar a navegação e a área principal', () => {
    render(<Dashboard />);

    expect(screen.getByRole('navigation')).toBeInTheDocument();
    expect(screen.getByRole('main')).toBeInTheDocument();
  });

  it('deve renderizar a View padrão de Funcionários do AFD', () => {
    render(<Dashboard />);

    expect(screen.getByTestId('view-afd-funcionarios')).toBeInTheDocument();
  });

  it('deve alternar a view ao clicar em um subitem do menu', async () => {
    const user = userEvent.setup();
    render(<Dashboard />);

    await user.click(screen.getByRole('button', { name: /Coletor/i }));
    await user.click(screen.getByRole('button', { name: 'Matrícula' }));

    expect(screen.getByTestId('view-coletor-matricula')).toBeInTheDocument();
    expect(screen.queryByTestId('view-afd-funcionarios')).not.toBeInTheDocument();
  });

  it.each([
    ['Funcionários (Tipo 5)', 'view-afd-funcionarios'],
    ['Ajustes Relógio (Tipo 4)', 'view-afd-relogio'],
    ['Eventos REP (Tipo 6)', 'view-afd-eventos'],
    ['Marcações (Tipo 3/7)', 'view-afd-marcacoes'],
  ])('deve exibir a view correta ao clicar em "%s"', async (rotulo, testId) => {
    const user = userEvent.setup();
    render(<Dashboard />);

    await user.click(screen.getByRole('button', { name: rotulo }));

    expect(screen.getByTestId(testId)).toBeInTheDocument();
  });

  it('deve exibir a view de Funcionários do Coletor com testid próprio', async () => {
    const user = userEvent.setup();
    render(<Dashboard />);

    await user.click(screen.getByRole('button', { name: /Coletor/i }));
    await user.click(screen.getByRole('button', { name: 'Funcionários' }));

    expect(screen.getByTestId('view-coletor-funcionarios')).toBeInTheDocument();
  });

  it('deve registrar todas as views do AFD e do Coletor', () => {
    const keysRegistradas = Object.keys(VIEW_REGISTRY);

    expect(keysRegistradas).toEqual(
      expect.arrayContaining([
        'funcionario',
        'relogio',
        'eventos',
        'marcacoes',
        'coletor_funcionario',
        'coletor_matricula',
      ])
    );
  });
});
