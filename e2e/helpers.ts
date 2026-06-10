import { type Page } from '@playwright/test';

/** Injects a fake auth user so ProtectedRoute lets the test through */
export async function injectTestUser(page: Page) {
  await page.addInitScript(() => {
    (window as { __TEST_AUTH_USER__?: unknown }).__TEST_AUTH_USER__ = {
      uid: 'e2e-test-uid',
      email: 'e2e@highsystem.test',
      displayName: 'E2E Tester',
    };
  });
}
