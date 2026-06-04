import { test, expect } from './fixtures/auth';

test.describe('Dashboard', () => {
  test('loads dashboard after login', async ({ authenticatedPage: page }) => {
    await expect(page).toHaveURL('/');
    await expect(page.getByRole('main')).toBeVisible();
  });

  test('shows navigation sidebar', async ({ authenticatedPage: page }) => {
    await expect(page.getByRole('navigation')).toBeVisible();
  });

  test('can navigate to projects', async ({ authenticatedPage: page }) => {
    await page.getByRole('link', { name: /projects/i }).first().click();
    await expect(page).toHaveURL('/projects');
  });
});
