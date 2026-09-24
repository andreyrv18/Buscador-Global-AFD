import { render } from 'vitest-browser-react';
import { expect, it, describe } from 'vitest';
import { page } from '@vitest/browser/context';
import Input from './Input';

describe('Input - Visual', () => {
    it('deve renderizar a label visualmente', async () => {
        render(<Input label="E-mail Corporativo" />);

        await expect.element(page.getByText('E-mail Corporativo')).toBeVisible();
    });

    it('deve aceitar digitação', async () => {
        render(<Input placeholder="Digite algo..." />);

        const input = page.getByPlaceholder('Digite algo...');
        await input.fill('Olá, mundo!');
        await expect.element(input).toHaveValue('Olá, mundo!');
    });

    it('deve exibir mensagem de erro visualmente', async () => {
        render(<Input error="Campo obrigatório" placeholder="E-mail" />);

        await expect.element(page.getByText('Campo obrigatório')).toBeVisible();
    });

    it('deve aparecer desabilitado', async () => {
        render(<Input disabled placeholder="Campo bloqueado" />);

        await expect.element(page.getByPlaceholder('Campo bloqueado')).toBeDisabled();
    });
});
