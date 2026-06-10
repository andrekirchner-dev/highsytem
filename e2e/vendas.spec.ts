import { test, expect } from '@playwright/test';
import { injectTestUser } from './helpers';

test.describe('Página Vendas (PDV)', () => {
  test.beforeEach(async ({ page }) => {
    await injectTestUser(page);
    await page.route('**/firestore.googleapis.com/**', (route) => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ documents: [] }),
    }));
    await page.route('**/Listen/channel**', (route) => route.abort());
    await page.goto('/vendas');
  });

  test('renderiza o campo de busca do PDV', async ({ page }) => {
    await expect(page.getByPlaceholder(/buscar produto ou sku/i)).toBeVisible({ timeout: 8000 });
  });

  test('renderiza o painel do carrinho', async ({ page }) => {
    await expect(page.getByText('Carrinho', { exact: true })).toBeVisible({ timeout: 8000 });
  });

  test('exibe mensagem de carrinho vazio', async ({ page }) => {
    await expect(page.getByText(/carrinho vazio/i)).toBeVisible({ timeout: 8000 });
  });

  test('exibe as 4 opções de pagamento no PDV', async ({ page }) => {
    await expect(page.getByRole('button', { name: /dinheiro/i })).toBeVisible({ timeout: 8000 });
    await expect(page.getByRole('button', { name: /pix/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /débito/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /crédito/i })).toBeVisible();
  });

  test('"Finalizar venda" está desabilitado com carrinho vazio', async ({ page }) => {
    await expect(page.getByRole('button', { name: /finalizar venda/i })).toBeDisabled({ timeout: 8000 });
  });

  test('seção de histórico está presente', async ({ page }) => {
    await expect(page.getByText('Histórico de vendas')).toBeVisible({ timeout: 8000 });
  });

  test('histórico exibe contagem de registros', async ({ page }) => {
    await expect(page.getByText(/registros/i)).toBeVisible({ timeout: 8000 });
  });

  test('categoria "Todos" está visível', async ({ page }) => {
    await expect(page.getByRole('button', { name: /^todos$/i })).toBeVisible({ timeout: 8000 });
  });

  test('campo de desconto está presente no carrinho', async ({ page }) => {
    await expect(page.getByText(/desconto/i).first()).toBeVisible({ timeout: 8000 });
  });
});
