import { test, expect } from '@playwright/test';

test.describe('Página de Login', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  test('renderiza todos os elementos essenciais', async ({ page }) => {
    await expect(page.getByRole('button', { name: /entrar com google/i })).toBeVisible();
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.getByRole('button', { name: /^entrar$/i })).toBeVisible();
  });

  test('exibe o logo na página', async ({ page }) => {
    // The logo container should be present
    await expect(page.locator('.font-display').first()).toBeVisible();
  });

  test('não faz nada ao submeter o formulário vazio (validação HTML nativa)', async ({ page }) => {
    await page.getByRole('button', { name: /^entrar$/i }).click();
    // Should still be on /login — no navigation
    await expect(page).toHaveURL(/\/login/);
  });

  test('exibe mensagem de erro com credenciais inválidas', async ({ page }) => {
    // Intercept Firebase Auth REST endpoint and return an error
    await page.route('**/accounts:signInWithPassword**', async (route) => {
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({ error: { code: 400, message: 'INVALID_PASSWORD', errors: [] } }),
      });
    });

    await page.locator('input[type="email"]').fill('wrong@example.com');
    await page.locator('input[type="password"]').fill('wrongpassword');
    await page.getByRole('button', { name: /^entrar$/i }).click();

    await expect(page.getByText(/e-mail ou senha inválidos/i)).toBeVisible({ timeout: 5000 });
  });

  test('botão do Google está visível e habilitado', async ({ page }) => {
    const googleBtn = page.getByRole('button', { name: /entrar com google/i });
    await expect(googleBtn).toBeEnabled();
  });

  test('divisor "ou" entre login Google e formulário está visível', async ({ page }) => {
    await expect(page.getByText('ou')).toBeVisible();
  });
});
