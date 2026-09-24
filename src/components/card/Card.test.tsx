import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import Card from './Card';

describe('Componente Card', () => {
    it('deve renderizar o conteúdo passado em children', () => {
        render(<Card>Conteúdo do Card</Card>);
        expect(screen.getByText('Conteúdo do Card')).toBeInTheDocument();
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
