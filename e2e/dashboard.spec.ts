import { test, expect } from '@playwright/test';
import { injectTestUser } from './helpers';

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await injectTestUser(page);
    // Stub Firestore REST calls so the page loads without a real backend
    await page.route('**/firestore.googleapis.com/**', (route) => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ documents: [] }),
    }));
    // Stub the WebSocket/listen endpoint too
    await page.route('**/Listen/channel**', (route) => route.abort());
    await page.goto('/');
  });

  test('renderiza os 4 cards de KPI', async ({ page }) => {
    await expect(page.getByText('Faturamento hoje')).toBeVisible({ timeout: 8000 });
    await expect(page.getByText('Faturamento no mês')).toBeVisible();
    await expect(page.getByText('Ticket médio')).toBeVisible();
    await expect(page.getByText('Vendas hoje')).toBeVisible();
  });

  test('botão "Realizar venda" está visível e habilitado', async ({ page }) => {
    const btn = page.getByRole('button', { name: /realizar venda/i });
    await expect(btn).toBeVisible({ timeout: 8000 });
    await expect(btn).toBeEnabled();
  });

  test('botão "Realizar venda" abre o modal de venda rápida', async ({ page }) => {
    await page.getByRole('button', { name: /realizar venda/i }).click();
    await expect(page.getByPlaceholder(/buscar produto pelo nome/i)).toBeVisible({ timeout: 3000 });
  });

  test('fechar o modal ao clicar no botão X', async ({ page }) => {
    await page.getByRole('button', { name: /realizar venda/i }).click();
    // The Lucide X icon renders with class "lucide-x"; the modal close button is inside <main>, not the sidebar
    await page.getByRole('main').locator('button').filter({ has: page.locator('svg.lucide-x') }).click();
    await expect(page.getByPlaceholder(/buscar produto pelo nome/i)).not.toBeVisible({ timeout: 3000 });
  });

  test('barra lateral (sidebar) está visível', async ({ page }) => {
    // AppLayout renders a sidebar — check for a nav element or known links
    await expect(page.locator('nav, aside, [class*="sidebar"]').first()).toBeVisible({ timeout: 8000 });
  });
});
