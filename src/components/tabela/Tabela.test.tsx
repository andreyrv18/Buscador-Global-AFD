import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import Tabela from './Tabela';

const mockColunas = [
    { key: 'id', titulo: 'ID' },
    { key: 'nome', titulo: 'Nome' },
    { key: 'acao', titulo: 'Ação', render: (item: any) => <button>Editar {item.nome}</button> }
];

const mockDados = [
    { id: 1, nome: 'João' },
    { id: 2, nome: 'Maria' },
];

describe('Componente Tabela', () => {
    it('deve renderizar os cabeçalhos das colunas', () => {
        render(<Tabela colunas={mockColunas} dados={mockDados} keyExtractor={(item) => item.id} />);
        expect(screen.getByText('ID')).toBeInTheDocument();
        expect(screen.getByText('Nome')).toBeInTheDocument();
        expect(screen.getByText('Ação')).toBeInTheDocument();
    });

    it('deve renderizar os dados e as funções render customizadas', () => {
        render(<Tabela colunas={mockColunas} dados={mockDados} keyExtractor={(item) => item.id} />);
        expect(screen.getByText('João')).toBeInTheDocument();
        expect(screen.getByText('Maria')).toBeInTheDocument();
        
        // Verifica se o render customizado da coluna Ação funcionou
        expect(screen.getByRole('button', { name: 'Editar João' })).toBeInTheDocument();
    });

    it('deve chamar onRowClick ao clicar em uma linha', () => {
        const handleRowClick = vi.fn();
        render(<Tabela colunas={mockColunas} dados={mockDados} keyExtractor={(item) => item.id} onRowClick={handleRowClick} />);
        
        // Clica na linha que contém o texto João
        fireEvent.click(screen.getByText('João'));
        
        // Confirma que a função onRowClick foi chamada passando o objeto da linha
        expect(handleRowClick).toHaveBeenCalledWith({ id: 1, nome: 'João' });
    });
});
