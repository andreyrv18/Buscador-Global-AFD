import { render } from 'vitest-browser-react';
import { expect, it, describe, vi } from 'vitest';
import { page } from '@vitest/browser/context';
import Switch from './Switch';

describe('Switch - Visual', () => {
    it('deve renderizar a label visualmente', async () => {
        render(<Switch label="Ativar Modo Escuro" />);

        await expect.element(page.getByText('Ativar Modo Escuro')).toBeVisible();
    });

    it('deve exibir o checkbox desmarcado por padrão', async () => {
        render(<Switch label="Notificações" />);

        const checkbox = page.getByRole('checkbox');
        await expect.element(checkbox).not.toBeChecked();
    });

    it('deve marcar ao clicar', async () => {
        render(<Switch label="Ligado" />);

        const checkbox = page.getByRole('checkbox');
        await checkbox.click();
        await expect.element(checkbox).toBeChecked();
    });

    it('deve emitir onChange com o valor correto', async () => {
        const handleChange = vi.fn();
        render(<Switch label="Ativo" onChange={handleChange} />);

        await page.getByRole('checkbox').click();
        expect(handleChange).toHaveBeenCalledWith(true);
    });

    it('deve aparecer desabilitado', async () => {
        render(<Switch label="Desabilitado" disabled />);

        await expect.element(page.getByRole('checkbox')).toBeDisabled();
    });
});
