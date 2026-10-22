import { render as renderBase, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactElement } from 'react';
import { describe, it, expect } from 'vitest';
import Dashboard from './Dashboard';
import { VIEW_REGISTRY } from '../routes/viewRegistry';
import { AfdProvider } from '../state/AfdContext';
import { fabricaDeWorkersFalsos } from '../state/WorkerAfdFalso';

const render = (ui: ReactElement) =>
  renderBase(<AfdProvider criarWorker={fabricaDeWorkersFalsos().criarWorker}>{ui}</AfdProvider>);

describe('Componente Dashboard (Integração sem Mocks)', () => {
  it('deve exibir a área de upload do AFD fora da view ativa', () => {
    render(<Dashboard />);

    const upload = screen.getByRole('region', { name: 'Arquivo Fonte de Dados (AFD)' });

    expect(screen.getByRole('main')).toContainElement(upload);
    expect(screen.getByTestId('view-afd-funcionarios')).not.toContainElement(upload);
  });

  it('deve manter o arquivo selecionado ao trocar de view', async () => {
    const user = userEvent.setup();
    render(<Dashboard />);

    await user.upload(screen.getByLabelText('Selecionar arquivo'), new File(['x'], 'AFD0001.txt'));
    await user.click(screen.getByRole('button', { name: 'Marcações (Tipo 3/7)' }));

    expect(screen.getByTestId('view-afd-marcacoes')).toBeInTheDocument();
    expect(screen.getByText('AFD0001.txt')).toBeInTheDocument();
  });

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
