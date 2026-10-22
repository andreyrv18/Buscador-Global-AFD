// src/App.test.tsx

import { render, screen } from '@testing-library/react';

import App from './App';

it('deve renderizar a aplicação com o título Buscador Global', () => {
  render(<App />);

  expect(screen.getByText('Buscador Global')).toBeInTheDocument();
})