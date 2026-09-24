import { render } from 'vitest-browser-react';
import { expect, it, describe } from 'vitest';
import { page } from '@vitest/browser/context';
import Navbar from './NavBar';

describe('Navbar - Visual', () => {
    it('deve renderizar todas as opções de menu', async () => {
        render(<Navbar activeItem="funcionario" />);

        await expect.element(page.getByText('Funcionários (Tipo 5)')).toBeVisible();
        await expect.element(page.getByText('Ajustes Relógio (Tipo 4)')).toBeVisible();
        await expect.element(page.getByText('Departamento')).toBeVisible();
        await expect.element(page.getByText('Marcações (Tipo 3/7)')).toBeVisible();
    });

    it('deve renderizar o item ativo com a classe correta', async () => {
        render(<Navbar activeItem="funcionario" />);

        // Verifica o item ativo
        const activeEl = page.getByText('Funcionários (Tipo 5)');
        await expect.element(activeEl).toBeVisible();

        // O elemento pai (li) deve ter a classe ativa
        const li = activeEl.element().closest('li');
        expect(li?.classList.contains('dixi-navbar__item--active')).toBe(true);
    });

    it('deve renderizar item sem classe ativa quando inativo', async () => {
        render(<Navbar activeItem="funcionario" />);

        const inactiveEl = page.getByText('Departamento');
        await expect.element(inactiveEl).toBeVisible();

        const li = inactiveEl.element().closest('li');
        expect(li?.classList.contains('dixi-navbar__item--active')).toBe(false);
    });
});
