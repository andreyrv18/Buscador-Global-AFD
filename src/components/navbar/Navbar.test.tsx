import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import Navbar from '../navbar/NavBar';
import { montarNavGroups } from './Navbar.data';
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
        'deve marcar como página atual o subitem "%s" dentro do grupo "%s"',
        (activeItemProp, _groupName, expectedSubItemText) => {
            render(<Navbar activeItem={activeItemProp} />);

            // O subitem precisa estar visível (grupo aberto) e marcado como atual
            const activeElement = screen.getByRole('button', { name: expectedSubItemText });
            expect(activeElement).toHaveAttribute('aria-current', 'page');
            expect(activeElement).toHaveClass('bga-navbar__item--active');
        }
    );

    it('deve renderizar o título com a classe de tipografia, sem "[object Object]"', () => {
        render(<Navbar activeItem="funcionario" />);

        const titulo = screen.getByRole('heading', { name: 'Buscador Global' });
        expect(titulo.className).not.toContain('[object Object]');
        expect(titulo.className).toMatch(/tituloModal/);
    });

    it('deve expandir e recolher o grupo ao clicar no cabeçalho do acordeão', async () => {
        const user = userEvent.setup();
        render(<Navbar activeItem="funcionario" />);

        // Por padrão o grupo AFD está aberto (pois "funcionario" pertence a ele)
        const afdHeader = screen.getByRole('button', { name: /AFD/i });
        expect(afdHeader).toHaveAttribute('aria-expanded', 'true');
        expect(screen.getByText('Funcionários (Tipo 5)')).toBeInTheDocument();

        await user.click(afdHeader);

        expect(afdHeader).toHaveAttribute('aria-expanded', 'false');
        expect(screen.queryByText('Funcionários (Tipo 5)')).not.toBeInTheDocument();

        await user.click(afdHeader);
        expect(screen.getByText('Funcionários (Tipo 5)')).toBeInTheDocument();
    });

    it('deve chamar a callback onSelectItem ao clicar em um subitem', async () => {
        const user = userEvent.setup();
        const handleSelect = vi.fn();

        render(<Navbar activeItem="funcionario" onSelectItem={handleSelect} />);

        await user.click(screen.getByRole('button', { name: 'Ajustes Relógio (Tipo 4)' }));

        expect(handleSelect).toHaveBeenCalledTimes(1);
        expect(handleSelect).toHaveBeenCalledWith('relogio');
    });

    it('deve permitir selecionar um subitem pelo teclado', async () => {
        const user = userEvent.setup();
        const handleSelect = vi.fn();

        render(<Navbar activeItem="funcionario" onSelectItem={handleSelect} />);

        screen.getByRole('button', { name: 'Eventos REP (Tipo 6)' }).focus();
        await user.keyboard('{Enter}');

        expect(handleSelect).toHaveBeenCalledWith('eventos');
    });

    it('deve permitir abrir outro grupo de menu manualmente', async () => {
        const user = userEvent.setup();
        render(<Navbar activeItem="funcionario" />);

        expect(screen.queryByText('Matrícula')).not.toBeInTheDocument();

        await user.click(screen.getByRole('button', { name: /Coletor/i }));

        expect(screen.getByRole('button', { name: 'Matrícula' })).toBeInTheDocument();
    });

    it('deve manter múltiplos grupos abertos ao mesmo tempo ao clicar neles', async () => {
        const user = userEvent.setup();
        render(<Navbar activeItem="funcionario" />);

        expect(screen.getByText('Funcionários (Tipo 5)')).toBeInTheDocument();
        expect(screen.queryByText('Matrícula')).not.toBeInTheDocument();

        await user.click(screen.getByRole('button', { name: /Coletor/i }));

        expect(screen.getByText('Funcionários (Tipo 5)')).toBeInTheDocument();
        expect(screen.getByText('Matrícula')).toBeInTheDocument();
    });
});

describe('montarNavGroups', () => {
    it('deve incluir o Show Case quando em desenvolvimento', () => {
        const chaves = montarNavGroups(true).map((grupo) => grupo.groupKey);
        expect(chaves).toEqual(['afd', 'coletor', 'showCase']);
    });

    it('deve omitir o Show Case em produção e manter o Coletor', () => {
        const chaves = montarNavGroups(false).map((grupo) => grupo.groupKey);
        expect(chaves).toEqual(['afd', 'coletor']);
    });
});
