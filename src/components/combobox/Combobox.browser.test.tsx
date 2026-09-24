import { render } from 'vitest-browser-react';
import { expect, it, describe, vi } from 'vitest';
import { page } from '@vitest/browser/context';
import Combobox from './Combobox';

const mockOptions = [
    { label: 'Funcionário', value: 'funcionario' },
    { label: 'Gestor', value: 'gestor' },
    { label: 'Administrador', value: 'admin' },
];

describe('Combobox - Visual', () => {
    it('deve renderizar o label e o placeholder', async () => {
        render(
            <Combobox
                label="Cargo"
                options={mockOptions}
                value=""
                onChange={() => {}}
                placeholder="Selecione o cargo..."
            />
        );

        await expect.element(page.getByText('Cargo')).toBeVisible();
        await expect.element(page.getByText('Selecione o cargo...')).toBeVisible();
    });

    it('deve exibir a opção selecionada', async () => {
        render(
            <Combobox options={mockOptions} value="gestor" onChange={() => {}} />
        );

        await expect.element(page.getByText('Gestor')).toBeVisible();
    });

    it('deve abrir o dropdown ao clicar e exibir as opções', async () => {
        render(
            <Combobox options={mockOptions} value="" onChange={() => {}} placeholder="Selecione..." />
        );

        // Clica para abrir o dropdown
        await page.getByText('Selecione...').click();

        // Verifica que as opções estão visíveis
        await expect.element(page.getByText('Funcionário')).toBeVisible();
        await expect.element(page.getByText('Gestor')).toBeVisible();
        await expect.element(page.getByText('Administrador')).toBeVisible();
    });

    it('deve emitir onChange ao selecionar uma opção', async () => {
        const handleChange = vi.fn();
        render(
            <Combobox options={mockOptions} value="" onChange={handleChange} placeholder="Selecione..." />
        );

        await page.getByText('Selecione...').click();
        await page.getByText('Administrador').click();

        expect(handleChange).toHaveBeenCalledWith('admin');
    });

    it('deve exibir mensagem de erro', async () => {
        render(
            <Combobox options={mockOptions} value="" onChange={() => {}} error="Seleção obrigatória" />
        );

        await expect.element(page.getByText('Seleção obrigatória')).toBeVisible();
    });
});
