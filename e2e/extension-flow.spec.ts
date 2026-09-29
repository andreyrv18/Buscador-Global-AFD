// e2e/extension-flow.spec.ts
import { test, expect } from './fixtures';

test.describe('Fluxo Principal da Extensão', () => {
    test('deve abrir o SidePanel e interagir com o botão', async ({ page, extensionId }) => {
        // 1. Navega para a página da extensão
        // Nota: dependendo da saída do seu build, tente 'index.html' ou 'src/index.html'
        await page.goto(`chrome-extension://${extensionId}/src/index.html`);

        // 2. Localiza um título h1 real (ou busque pelo texto que está dentro dele)
        const title = page.getByRole('heading', { name: /buscador global/i });
        await expect(title).toBeVisible();

        // 3. Simula o clique no botão (troque "Texto Botão" pelo texto real do seu botão)
        const button = page.getByRole('button', { name: /salvar/i });
        await expect(button).toBeVisible();
        await button.click();

        // 4. Valida se o botão continuou visível ou executou alguma ação
        await expect(button).toBeEnabled();
    });
});