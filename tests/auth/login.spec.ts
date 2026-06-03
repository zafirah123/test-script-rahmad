import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { step, note } from '../utils/evidence';

const USER = process.env.TEST_USER ?? 'baby8';
const PASSWORD = process.env.TEST_PASSWORD ?? '123456';

test.describe('Authentication - Login', () => {
  test.beforeEach(async ({}, testInfo) => {
    await note(
      'scenario-info',
      [
        `Title:     ${testInfo.title}`,
        `User:      ${USER}`,
        `Base URL:  ${process.env.BASE_URL ?? '(default)'}`,
        `Started:   ${new Date().toISOString()}`,
      ].join('\n'),
    );
  });

  test('login page renders the form', async ({ page }) => {
    const login = new LoginPage(page);

    await step(page, 'open sign-in page', async () => {
      await login.goto();
    });

    await step(page, 'verify form is visible', async () => {
      await login.expectLoaded();
    });
  });

  test('user baby8 can log in with valid credentials', async ({ page }) => {
    const login = new LoginPage(page);

    await step(page, 'open sign-in page', async () => {
      await login.goto();
      await login.expectLoaded();
    });

    await step(page, 'fill credentials', async () => {
      await login.emailInput.fill(USER);
      await login.passwordInput.fill(PASSWORD);
    });

    await step(page, 'submit login form', async () => {
      await login.submitButton.click();
      await page.waitForURL((url) => !/sign-in/.test(url.pathname), { timeout: 15_000 });
    });

    await step(page, 'landed on authenticated page', async () => {
      await expect(login.submitButton).toHaveCount(0);
    });

    await note('final-url', page.url());
  });

  test('invalid credentials keep the user on the sign-in page', async ({ page }) => {
    const login = new LoginPage(page);

    await step(page, 'open sign-in page', async () => {
      await login.goto();
      await login.expectLoaded();
    });

    await step(page, 'fill wrong credentials', async () => {
      await login.emailInput.fill(USER);
      await login.passwordInput.fill('wrong-password-xyz');
    });

    await step(page, 'submit login form', async () => {
      await login.submitButton.click();
      await page.waitForTimeout(1500);
    });

    await step(page, 'still on sign-in page', async () => {
      await expect(page).toHaveURL(/sign-in/);
      await expect(login.submitButton).toBeVisible();
    });

    await note('final-url', page.url());
  });
});
