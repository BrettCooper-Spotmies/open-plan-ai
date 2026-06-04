import { test, expect } from './fixtures/auth';

test.describe('Projects', () => {
  test.beforeEach(async ({ authenticatedPage: page }) => {
    await page.goto('/projects');
  });

  test('shows projects list page', async ({ authenticatedPage: page }) => {
    await expect(page).toHaveURL('/projects');
    await expect(page.getByRole('heading', { name: /projects/i })).toBeVisible();
  });

  test('can open new project form', async ({ authenticatedPage: page }) => {
    await page.getByRole('link', { name: /new project/i }).click();
    await expect(page).toHaveURL('/projects/new');
    await expect(page.getByRole('heading', { name: /new project|create project/i })).toBeVisible();
  });

  test('new project form validates required fields', async ({ authenticatedPage: page }) => {
    await page.goto('/projects/new');
    await page.getByRole('button', { name: /create|save/i }).click();
    await expect(page.getByText(/required|project name/i)).toBeVisible();
  });
});
