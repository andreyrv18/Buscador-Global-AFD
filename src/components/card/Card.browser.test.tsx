import { render } from 'vitest-browser-react';
import { expect, it, describe } from 'vitest';
import { page } from '@vitest/browser/context';
import Card from './Card';

describe('Card - Visual', () => {
    it('deve renderizar o conteúdo children', async () => {
        render(<Card>Conteúdo do Card</Card>);

        await expect.element(page.getByText('Conteúdo do Card')).toBeVisible();
    });

    it('deve renderizar o título como h3', async () => {
        render(<Card title="Relatório Mensal">Dados aqui</Card>);

        const titulo = page.getByRole('heading', { name: 'Relatório Mensal', level: 3 });
        await expect.element(titulo).toBeVisible();
    });

    it('deve renderizar o slot de ação no cabeçalho', async () => {
        render(
            <Card title="Usuários" action={<button>Exportar</button>}>
                Lista de usuários
            </Card>
        );

        await expect.element(page.getByRole('button', { name: 'Exportar' })).toBeVisible();
    });
});
