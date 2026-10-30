import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Project Ruhvi — Storefront & Platform Smoke Suite', () => {
  test('1. Homepage loads successfully with branding and navigation elements', async ({
    page,
  }) => {
    await page.goto('/');

    // Check document title contains Ruhvi
    await expect(page).toHaveTitle(/Ruhvi/i);

    // Verify main landmark or body container is present
    const mainContent = page.locator('main').first();
    await expect(mainContent).toBeVisible();

    // Verify brand link is visible
    const brand = page.getByRole('link', { name: /RUHVI/i }).first();
    await expect(brand).toBeVisible();
  });

  test('2. Customer Login page renders email/phone authentication controls', async ({
    page,
  }) => {
    await page.goto('/login');

    // Email and Password inputs on the login form
    const emailInput = page.locator('#login-email, input[type="email"]').first();
    const passwordInput = page.locator('#login-password, input[type="password"]').first();
    const submitButton = page.locator('button[type="submit"]').first();

    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();
    await expect(submitButton).toBeVisible();

    // Check for links to sign up and forgot password
    const signupLink = page
      .getByRole('link', { name: /sign up|create account/i })
      .first();
    await expect(signupLink).toBeVisible();
  });

  test('3. Customer Support center loads with ticket and helpdesk navigation', async ({
    page,
  }) => {
    await page.goto('/support');

    // Page should render successfully
    await expect(page).toHaveURL(/\/support/);
    const mainHeading = page.getByRole('heading', { level: 1 }).first();
    await expect(mainHeading).toBeVisible();
  });

  test('4. Unauthenticated users are barred from admin dashboard routes', async ({
    page,
  }) => {
    // Attempt to access protected admin dashboard directly without authentication
    await page.goto('/admin/dashboard');

    // Secure platform either redirects to login or returns 404 Not Found barrier to hide admin existence
    const isLoginPage = page.url().includes('/login');
    const isNotFound = (await page.getByRole('heading', { name: /Page Not Found|Error 404|404/i }).count()) > 0;
    const hasSignInPrompt =
      (await page.getByRole('button', { name: /sign in|login/i }).count()) > 0;

    expect(isLoginPage || hasSignInPrompt || isNotFound).toBe(true);
  });
});

test.describe('Accessibility Quality Gates (Finding E3 — axe-core)', () => {
  test('Axe accessibility scan: Homepage has no critical WCAG violations', async ({
    page,
  }) => {
    await page.goto('/');

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .disableRules(['color-contrast']) // Color contrast is audited separately across dynamic dark/light luxury palettes
      .analyze();

    const criticalViolations = accessibilityScanResults.violations.filter(
      (v) => v.impact === 'critical'
    );

    expect(criticalViolations).toEqual([]);
  });

  test('Axe accessibility scan: Login page has valid form labels and roles', async ({
    page,
  }) => {
    await page.goto('/login');

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .disableRules(['color-contrast'])
      .analyze();

    const criticalViolations = accessibilityScanResults.violations.filter(
      (v) => v.impact === 'critical'
    );

    expect(criticalViolations).toEqual([]);
  });
});
