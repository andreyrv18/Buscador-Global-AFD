import { render } from 'vitest-browser-react';
import { expect, it, describe, vi } from 'vitest';
import { page } from '@vitest/browser/context';
import Tabela from './Tabela';

interface Funcionario {
    id: string;
    nome: string;
    cargo: string;
}

const mockColunas = [
    { key: 'id', titulo: 'Matrícula' },
    { key: 'nome', titulo: 'Nome' },
    { key: 'cargo', titulo: 'Cargo' },
];

const mockDados: Funcionario[] = [
    { id: '001', nome: 'João Silva', cargo: 'Analista' },
    { id: '002', nome: 'Maria Souza', cargo: 'Gestora' },
];

describe('Tabela - Visual', () => {
    it('deve renderizar os cabeçalhos das colunas', async () => {
        render(
            <Tabela
                colunas={mockColunas}
                dados={mockDados}
                keyExtractor={(item) => item.id}
            />
        );

        await expect.element(page.getByRole('columnheader', { name: 'Matrícula' })).toBeVisible();
        await expect.element(page.getByRole('columnheader', { name: 'Nome' })).toBeVisible();
        await expect.element(page.getByRole('columnheader', { name: 'Cargo' })).toBeVisible();
    });

    it('deve renderizar os dados das linhas', async () => {
        render(
            <Tabela
                colunas={mockColunas}
                dados={mockDados}
                keyExtractor={(item) => item.id}
            />
        );

        await expect.element(page.getByText('João Silva')).toBeVisible();
        await expect.element(page.getByText('Maria Souza')).toBeVisible();
        await expect.element(page.getByText('Gestora')).toBeVisible();
    });

    it('deve chamar onRowClick ao clicar em uma linha', async () => {
        const handleRowClick = vi.fn();
        render(
            <Tabela
                colunas={mockColunas}
                dados={mockDados}
                keyExtractor={(item) => item.id}
                onRowClick={handleRowClick}
            />
        );

        await page.getByText('João Silva').click();
        expect(handleRowClick).toHaveBeenCalledWith({ id: '001', nome: 'João Silva', cargo: 'Analista' });
    });
});
