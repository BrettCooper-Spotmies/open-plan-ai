import { test as base, expect, type Page } from '@playwright/test';

interface AuthFixtures {
  authenticatedPage: Page;
}

export const test = base.extend<AuthFixtures>({
  authenticatedPage: async ({ page }, use) => {
    const email = process.env.E2E_USER_EMAIL ?? 'test@openplanai.com';
    const password = process.env.E2E_USER_PASSWORD ?? 'TestPass123!';

    await page.goto('/login');
    await page.getByLabel(/email/i).fill(email);
    await page.getByLabel(/password/i).fill(password);
    await page.getByRole('button', { name: /sign in/i }).click();
    await page.waitForURL('/');

    await use(page);
  },
});

export { expect };
