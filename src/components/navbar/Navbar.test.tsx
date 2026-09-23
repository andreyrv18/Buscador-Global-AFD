import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import Navbar from './NavBar';

describe("Componente Navbar", () =>{
    it('deve conter os textos do NavItemKey', () => {
        render(<Navbar></Navbar>);

        expect(screen.getByTestId('dixi-navbar')).toHaveTextContent('Funcionários (Tipo 5)')
    })
})