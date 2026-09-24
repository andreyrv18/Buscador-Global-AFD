import { render } from 'vitest-browser-react';
import { expect, it, describe, vi } from 'vitest';
import { page } from '@vitest/browser/context';
import Button from './Button';

describe('Button - Visual', () => {
    it('deve renderizar o texto visualmente', async () => {
        render(<Button variant="outline">Salvar</Button>);

        await expect.element(page.getByText('Salvar')).toBeVisible();
    });

    it('deve renderizar variant filled', async () => {
        render(<Button variant="filled">Confirmar</Button>);

        await expect.element(page.getByText('Confirmar')).toBeVisible();
    });

    it('deve aparecer desabilitado', async () => {
        render(<Button disabled>Bloqueado</Button>);

        const btn = page.getByRole('button', { name: 'Bloqueado' });
        await expect.element(btn).toBeDisabled();
    });

    it('deve chamar onClick ao clicar', async () => {
        const handleClick = vi.fn();
        render(<Button onClick={handleClick}>Clique Aqui</Button>);

        await page.getByText('Clique Aqui').click();
        expect(handleClick).toHaveBeenCalledTimes(1);
    });
});
