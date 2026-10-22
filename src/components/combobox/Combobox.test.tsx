import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import Combobox from './Combobox';

const mockOptions = [
    { label: 'Opção 1', value: '1' },
    { label: 'Opção 2', value: '2' },
    { label: 'Opção 3', value: '3' },
    { label: 'Opção 4', value: '4' },
];

describe('Componente Combobox', () => {
    it('deve expor um combobox nomeado pela label e exibir o placeholder', () => {
        render(<Combobox options={mockOptions} value="" onChange={() => {}} label="Escolha" placeholder="Selecione algo" />);

        const combo = screen.getByRole('combobox', { name: 'Escolha' });
        expect(combo).toHaveAttribute('aria-expanded', 'false');
        expect(combo).toHaveTextContent('Selecione algo');
        expect(screen.getByLabelText('Escolha')).toBe(combo);
    });

    it('deve exibir a opção selecionada', () => {
        render(<Combobox options={mockOptions} value="4" onChange={() => {}} label="Escolha" />);
        expect(screen.getByRole('combobox', { name: 'Escolha' })).toHaveTextContent('Opção 4');
    });

    it('deve abrir a lista ao clicar e emitir onChange ao selecionar', async () => {
        const user = userEvent.setup();
        const handleChange = vi.fn();
        render(<Combobox options={mockOptions} value="" onChange={handleChange} label="Escolha" />);

        const combo = screen.getByRole('combobox', { name: 'Escolha' });
        await user.click(combo);

        expect(combo).toHaveAttribute('aria-expanded', 'true');
        expect(screen.getByRole('listbox')).toBeInTheDocument();

        await user.click(screen.getByRole('option', { name: 'Opção 1' }));

        expect(handleChange).toHaveBeenCalledWith('1');
        expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
        expect(combo).toHaveAttribute('aria-expanded', 'false');
    });

    it('deve abrir ao clicar na label', async () => {
        const user = userEvent.setup();
        render(<Combobox options={mockOptions} value="" onChange={() => {}} label="Escolha" />);

        await user.click(screen.getByText('Escolha'));

        expect(screen.getByRole('combobox', { name: 'Escolha' })).toHaveAttribute('aria-expanded', 'true');
    });

    it('deve marcar a opção atual com aria-selected', async () => {
        const user = userEvent.setup();
        render(<Combobox options={mockOptions} value="2" onChange={() => {}} label="Escolha" />);

        await user.click(screen.getByRole('combobox', { name: 'Escolha' }));

        expect(screen.getByRole('option', { name: 'Opção 2' })).toHaveAttribute('aria-selected', 'true');
        expect(screen.getByRole('option', { name: 'Opção 1' })).toHaveAttribute('aria-selected', 'false');
    });

    it('deve permitir navegar e selecionar pelo teclado', async () => {
        const user = userEvent.setup();
        const handleChange = vi.fn();
        render(<Combobox options={mockOptions} value="" onChange={handleChange} label="Escolha" />);

        const combo = screen.getByRole('combobox', { name: 'Escolha' });
        combo.focus();
        await user.keyboard('{ArrowDown}');

        // Ao abrir, o foco vai para a primeira opção
        expect(screen.getByRole('option', { name: 'Opção 1' })).toHaveFocus();

        await user.keyboard('{ArrowDown}{ArrowDown}{Enter}');

        expect(handleChange).toHaveBeenCalledWith('3');
        expect(combo).toHaveFocus();
    });

    it('deve fechar com Escape e devolver o foco ao campo', async () => {
        const user = userEvent.setup();
        const handleChange = vi.fn();
        render(<Combobox options={mockOptions} value="" onChange={handleChange} label="Escolha" />);

        const combo = screen.getByRole('combobox', { name: 'Escolha' });
        await user.click(combo);
        await user.keyboard('{Escape}');

        expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
        expect(combo).toHaveFocus();
        expect(handleChange).not.toHaveBeenCalled();
    });

    it('deve fechar ao clicar fora do componente', async () => {
        const user = userEvent.setup();
        render(
            <>
                <Combobox options={mockOptions} value="" onChange={() => {}} label="Escolha" />
                <button type="button">Fora</button>
            </>
        );

        await user.click(screen.getByRole('combobox', { name: 'Escolha' }));
        await user.click(screen.getByRole('button', { name: 'Fora' }));

        expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    });

    it('deve limpar a seleção sem abrir a lista', async () => {
        const user = userEvent.setup();
        const handleChange = vi.fn();
        render(<Combobox options={mockOptions} value="1" onChange={handleChange} label="Escolha" />);

        await user.click(screen.getByRole('button', { name: 'Limpar seleção' }));

        expect(handleChange).toHaveBeenCalledWith('');
        expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    });

    it('não deve abrir quando estiver desabilitado', async () => {
        const user = userEvent.setup();
        render(<Combobox options={mockOptions} value="1" onChange={() => {}} label="Escolha" disabled />);

        const combo = screen.getByRole('combobox', { name: 'Escolha' });
        expect(combo).toBeDisabled();
        expect(screen.queryByRole('button', { name: 'Limpar seleção' })).not.toBeInTheDocument();

        await user.click(screen.getByText('Opção 1'));

        expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    });

    it('deve exibir o erro associado ao campo', () => {
        render(<Combobox options={mockOptions} value="" onChange={() => {}} label="Escolha" error="Campo obrigatório" />);

        const combo = screen.getByRole('combobox', { name: 'Escolha' });
        expect(combo).toHaveAttribute('aria-invalid', 'true');
        expect(combo).toHaveAccessibleDescription('Campo obrigatório');
    });

    it('não deve oferecer "Limpar seleção" quando não for limpável', () => {
        render(<Combobox options={mockOptions} value="2" onChange={() => {}} label="Escolha" limpavel={false} />);

        expect(screen.getByRole('combobox', { name: 'Escolha' })).toHaveTextContent('Opção 2');
        expect(screen.queryByRole('button', { name: 'Limpar seleção' })).not.toBeInTheDocument();
    });
});
