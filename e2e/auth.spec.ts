import { test, expect } from '@playwright/test';
import { LoginPage } from './pages/LoginPage';

test.describe('Authentication', () => {
  let loginPage: LoginPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    await loginPage.goto();
  });

  test('shows login form', async ({ page }) => {
    await expect(page).toHaveTitle(/open plan/i);
    await expect(loginPage.emailInput).toBeVisible();
    await expect(loginPage.passwordInput).toBeVisible();
    await expect(loginPage.submitButton).toBeVisible();
  });

  test('shows validation errors for empty submission', async () => {
    await loginPage.submitButton.click();
    await expect(loginPage.emailInput).toBeFocused();
  });

  test('shows error for invalid credentials', async () => {
    await loginPage.login('wrong@example.com', 'wrongpassword');
    await expect(loginPage.errorMessage).toBeVisible();
  });

  test('navigates to forgot password', async ({ page }) => {
    await loginPage.forgotPasswordLink.click();
    await expect(page).toHaveURL(/forgot-password/);
  });

  test('navigates to signup', async ({ page }) => {
    await loginPage.signupLink.click();
    await expect(page).toHaveURL(/signup/);
  });
});

test.describe('Route protection', () => {
  test('redirects unauthenticated users to login', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/login/);
  });

  test('redirects unauthenticated users from projects to login', async ({ page }) => {
    await page.goto('/projects');
    await expect(page).toHaveURL(/login/);
  });
});
