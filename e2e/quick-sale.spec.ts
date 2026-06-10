import { test, expect } from '@playwright/test';
import { injectTestUser } from './helpers';

test.describe('Modal de venda rápida (QuickSaleModal)', () => {
  test.beforeEach(async ({ page }) => {
    await injectTestUser(page);
    await page.route('**/firestore.googleapis.com/**', (route) => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ documents: [] }),
    }));
    await page.route('**/Listen/channel**', (route) => route.abort());
    await page.goto('/');
    await page.getByRole('button', { name: /realizar venda/i }).click();
  });

  test('o modal abre com o campo de busca em foco', async ({ page }) => {
    const input = page.getByPlaceholder(/buscar produto pelo nome/i);
    await expect(input).toBeVisible();
    await expect(input).toBeFocused();
  });

  test('exibe as 4 opções de pagamento', async ({ page }) => {
    await expect(page.getByRole('button', { name: /dinheiro/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /pix/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /débito/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /crédito/i })).toBeVisible();
  });

  test('"Finalizar" está desabilitado com o carrinho vazio', async ({ page }) => {
    await expect(page.getByRole('button', { name: /finalizar/i })).toBeDisabled();
  });

  test('alterna o método de pagamento ao clicar', async ({ page }) => {
    const dinheiroBtn = page.getByRole('button', { name: /dinheiro/i });
    await dinheiroBtn.click();
    // After clicking Dinheiro, it should have the active styling (text-primary class)
    await expect(dinheiroBtn).toHaveClass(/text-primary/);
  });

  test('exibe o total R$ 0,00 com o carrinho vazio', async ({ page }) => {
    await expect(page.getByText('R$ 0,00')).toBeVisible();
  });

  test('fechar o modal ao clicar no botão X', async ({ page }) => {
    // The modal close button is inside <main> (scoped to avoid the sidebar's X toggle button)
    await page.getByRole('main').locator('button').filter({ has: page.locator('svg.lucide-x') }).click();
    await expect(page.getByPlaceholder(/buscar produto pelo nome/i)).not.toBeVisible({ timeout: 3000 });
  });
});
