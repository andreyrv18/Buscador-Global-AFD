import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import Navbar from '../navbar/NavBar';
import type { NavItemKey } from './Navbar.types';

describe('Componente Navbar (Acordeão)', () => {
    // Matriz de casos para validar se cada subitem fica ativo e visível no grupo correto
    const cases: Array<[NavItemKey, string, string]> = [
        ['funcionario', 'AFD', 'Funcionários (Tipo 5)'],
        ['relogio', 'AFD', 'Ajustes Relógio (Tipo 4)'],
        ['eventos', 'AFD', 'Eventos REP (Tipo 6)'],
        ['marcacoes', 'AFD', 'Marcações (Tipo 3/7)'],
        ['coletor_funcionario', 'Coletor', 'Funcionários'],
        ['coletor_matricula', 'Coletor', 'Matrícula'],
    ];

    it.each(cases)(
        'deve abrir o grupo "%s" e aplicar a classe ativa no subitem "%s"',
        (activeItemProp, _groupName, expectedSubItemText) => {
            render(<Navbar activeItem={activeItemProp} />);

            // O subitem precisa estar visível (grupo aberto) e ter a classe ativa
            const activeElement = screen.getByText(expectedSubItemText).closest('li');
            expect(activeElement).toBeInTheDocument();
            expect(activeElement).toHaveClass('bga-navbar__item--active');
        }
    );

    it('deve expandir e recolher o grupo ao clicar no cabeçalho do acordeão', async () => {
        const user = userEvent.setup();
        render(<Navbar activeItem="funcionario" />);

        // Por padrão o grupo AFD está aberto (pois "funcionario" pertence a ele)
        expect(screen.getByText('Funcionários (Tipo 5)')).toBeInTheDocument();

        // Clica no cabeçalho "AFD" para recolher
        const afdHeader = screen.getByRole('button', { name: /AFD/i });
        await user.click(afdHeader);

        // O item não deve mais estar visível na tela
        expect(screen.queryByText('Funcionários (Tipo 5)')).not.toBeInTheDocument();

        // Clica novamente para reabrir
        await user.click(afdHeader);
        expect(screen.getByText('Funcionários (Tipo 5)')).toBeInTheDocument();
    });

    it('deve chamar a callback onSelectItem ao clicar em um subitem', async () => {
        const user = userEvent.setup();
        const handleSelect = vi.fn();

        render(<Navbar activeItem="funcionario" onSelectItem={handleSelect} />);

        // Clica no subitem 'Ajustes Relógio (Tipo 4)' que está visível no grupo AFD
        const relogioItem = screen.getByText('Ajustes Relógio (Tipo 4)');
        await user.click(relogioItem);

        expect(handleSelect).toHaveBeenCalledTimes(1);
        expect(handleSelect).toHaveBeenCalledWith('relogio');
    });

    it('deve permitir abrir outro grupo de menu manualmente', async () => {
        const user = userEvent.setup();
        render(<Navbar activeItem="funcionario" />);

        // Subitem do grupo "Coletor" não deve estar na tela inicialmente
        expect(screen.queryByText('Matrícula')).not.toBeInTheDocument();

        // Clica no cabeçalho do grupo "Coletor" para expandir
        const coletorHeader = screen.getByRole('button', { name: /Coletor/i });
        await user.click(coletorHeader);

        // Agora o subitem "Matrícula" deve ser exibido
        expect(screen.getByText('Matrícula')).toBeInTheDocument();
    });

    it('deve manter múltiplos grupos abertos ao mesmo tempo ao clicar neles', async () => {
        const user = userEvent.setup();
        render(<Navbar activeItem="funcionario" />);

        // Inicialmente, grupo AFD está aberto ("Funcionários (Tipo 5)" visível)
        expect(screen.getByText('Funcionários (Tipo 5)')).toBeInTheDocument();
        // Grupo Coletor está fechado ("Matrícula" oculto)
        expect(screen.queryByText('Matrícula')).not.toBeInTheDocument();

        // Clica no grupo Coletor
        const coletorHeader = screen.getByRole('button', { name: /Coletor/i });
        await user.click(coletorHeader);

        // AGORA AMBOS DEVEM ESTAR VISÍVEIS SIMULTANEAMENTE!
        expect(screen.getByText('Funcionários (Tipo 5)')).toBeInTheDocument();
        expect(screen.getByText('Matrícula')).toBeInTheDocument();
    });
});