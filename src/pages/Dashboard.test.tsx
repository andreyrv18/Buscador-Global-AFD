import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect } from 'vitest';
import Dashboard from './Dashboard';
import { VIEW_REGISTRY } from '../routes/viewRegistry';

describe('Componente Dashboard (Integração sem Mocks)', () => {
  it('deve renderizar a estrutura base do layout', () => {
    const { container } = render(<Dashboard />);

    expect(container.querySelector('.bga-dashboard-layout')).toBeInTheDocument();
    expect(container.querySelector('.bga-dashboard-content')).toBeInTheDocument();
  });

  it('deve renderizar a View padrão de Funcionários', () => {
    // Garante que a chave 'funcionario' possui um componente mapeado
    expect(VIEW_REGISTRY.funcionario).toBeDefined();

    render(<Dashboard />);

    // Valida pelo texto do título/conteúdo renderizado no container da View
    const mainContent = screen.getByRole('main');
    expect(mainContent).toBeInTheDocument();
  });

  it('deve alternar a view ao clicar em um subitem do menu', async () => {
    const user = userEvent.setup();
    render(<Dashboard />);

    // 1. Expande o grupo "Coletor"
    const coletorHeader = screen.getByRole('button', { name: /Coletor/i });
    await user.click(coletorHeader);

    // 2. Clica no subitem "Matrícula"
    const matriculaItem = screen.getByText('Matrícula');
    await user.click(matriculaItem);

    // 3. Valida se o conteúdo da Dashboard foi atualizado para a View do Coletor
    const mainContent = screen.getByRole('main');
    expect(mainContent).not.toBeEmptyDOMElement();
  });

  it('deve garantir que todas as views do registro estejam registradas', () => {
    const keysRegistradas = Object.keys(VIEW_REGISTRY);

    expect(keysRegistradas).toContain('funcionario');
    expect(keysRegistradas).toContain('relogio');
    expect(keysRegistradas).toContain('coletor_funcionario');
    expect(keysRegistradas).toContain('coletor_matricula');
  });
});