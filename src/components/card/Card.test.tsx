import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import Card from './Card';
import Button from '../button/Button';
import userEvent from '@testing-library/user-event';

describe('Componente Card', () => {
    it('deve renderizar o conteúdo passado em children', () => {
        render(<Card>Conteúdo do Card</Card>);
        expect(screen.getByText('Conteúdo do Card')).toBeInTheDocument();
    });

    it('deve chamar a função onClick quando for clicado o botão dentro do card', async () => {
        const user = userEvent.setup();
        const handleOnClick = vi.fn();

        render(<Card><Button onClick={handleOnClick}>Clique aqui</Button>Conteúdo do Card</Card>);
        expect(screen.getByText('Conteúdo do Card')).toBeInTheDocument();
        await user.click(screen.getByRole('button', { name: /Clique aqui/i }));
        expect(handleOnClick).toHaveBeenCalledTimes(1);
    });


    it('deve renderizar o título se fornecido', () => {
        render(<Card title="Meu Título">Conteúdo</Card>);
        expect(screen.getByText('Meu Título')).toBeInTheDocument();
        expect(screen.getByText('Meu Título').tagName).toBe('H3');
    });

    it('deve renderizar a ação se fornecida', () => {
        render(<Card action={<button>Salvar</button>}>Conteúdo</Card>);
        expect(screen.getByRole('button', { name: 'Salvar' })).toBeInTheDocument();
    });
});
