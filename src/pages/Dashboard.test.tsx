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

//   it('deve quebrar caso a View padrão "funcionario" não exista no registro', () => {
//     // Garante que a chave 'funcionario' possui um componente válido no registro
//     expect(VIEW_REGISTRY.funcionario).toBeDefined();

//     render(<Dashboard />);

//     // Se a view não for renderizada no DOM, o teste quebra aqui
//     const activeViewContainer = screen.getByTestId('view-funcionarios-afd');
//     expect(activeViewContainer).toBeInTheDocument();
//   });

//   it('deve alternar e falhar se tentar renderizar um subitem sem componente mapeado', async () => {
//     const user = userEvent.setup();
//     render(<Dashboard />);

//     // Clica no cabeçalho "Coletor" para expandir
//     const coletorHeader = screen.getByRole('button', { name: /Coletor/i });
//     await user.click(coletorHeader);

//     // Clica no subitem "Matrícula"
//     const matriculaItem = screen.getByText('Matrícula');
//     await user.click(matriculaItem);

//     // Exige que a view real de Matrícula do Coletor esteja no DOM (com seu data-testid real)
//     // Se a tela não existir ou não renderizar, o getByTestId lança erro e quebra a suite
//     expect(screen.getByTestId('view-matricula-afd')).toBeInTheDocument();
//   });

  it('deve quebrar o teste se algum item do Navbar não possuir mapeamento no VIEW_REGISTRY', () => {
    // Validação estática no registro: impede subir código sem mapa de views completo
    const keysRegistradas = Object.keys(VIEW_REGISTRY);

    expect(keysRegistradas).toContain('funcionario');
    expect(keysRegistradas).toContain('relogio');
    expect(keysRegistradas).toContain('coletor_funcionario');
    expect(keysRegistradas).toContain('coletor_matricula');
  });
});