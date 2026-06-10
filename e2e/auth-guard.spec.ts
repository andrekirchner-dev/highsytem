import { test, expect } from '@playwright/test';

test.describe('Proteção de rotas autenticadas', () => {
  test('redireciona / para /login quando não autenticado', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/login/);
  });

  test('redireciona /vendas para /login quando não autenticado', async ({ page }) => {
    await page.goto('/vendas');
    await expect(page).toHaveURL(/\/login/);
  });

  test('redireciona /estoque para /login quando não autenticado', async ({ page }) => {
    await page.goto('/estoque');
    await expect(page).toHaveURL(/\/login/);
  });

  test('rota /login é acessível sem autenticação', async ({ page }) => {
    await page.goto('/login');
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByRole('button', { name: /^entrar$/i })).toBeVisible();
  });

  test('rota desconhecida redireciona para /', async ({ page }) => {
    // Without auth, /* → / → /login
    await page.goto('/rota-inexistente');
    await expect(page).toHaveURL(/\/login/);
  });
});
