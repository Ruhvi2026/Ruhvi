---
name: playwright
description: >-
  End-to-end (E2E) testing skill for the Ruhvi project using Playwright.
  Use this skill when writing, running, or debugging Playwright tests for any
  feature: authentication flows, checkout, AI Co-Founder chat, admin dashboard,
  task manager, or any other user-facing page. Covers setup, test authoring,
  fixtures, page-object model, CI integration, and debugging strategies.
---

# Playwright E2E Testing — Ruhvi Project

## Project Context

- **Framework**: Next.js 15 (App Router) + TypeScript
- **Auth**: Firebase Auth (client) + Supabase (DB/RLS)
- **Dev server**: `npm run dev` → `http://localhost:3000`
- **Existing tests**: Jest unit tests (`jest.config.js`, `ts-jest`)
- **Playwright config**: `playwright.config.ts` at project root
- **Test directory**: `tests/e2e/` (all Playwright specs live here)

---

## Step 0 — First-time Setup

Run ONCE when Playwright is not yet installed:

```powershell
# Install Playwright and browsers
npx -y playwright install --with-deps

# Add @playwright/test to devDependencies if missing
npm install --save-dev @playwright/test
```

Scaffold config if `playwright.config.ts` does not exist:

```powershell
npx playwright init
```

Recommended `playwright.config.ts` for Ruhvi:

```ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['html', { open: 'never' }], ['list']],
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox',  use: { ...devices['Desktop Firefox'] } },
    { name: 'mobile',   use: { ...devices['Pixel 5'] } },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
```

---

## Step 1 — Running Tests

```powershell
npx playwright test                             # all tests
npx playwright test tests/e2e/auth.spec.ts      # specific spec
npx playwright test --grep "login"              # filter by title
npx playwright test --ui                        # interactive UI mode
npx playwright test --headed                    # see the browser
npx playwright show-report                      # open HTML report
```

---

## Step 2 — Page Object Model (POM)

Always use POM. Place page objects in `tests/e2e/pages/`.

### `tests/e2e/pages/LoginPage.ts`

```ts
import { type Page, type Locator } from '@playwright/test';

export class LoginPage {
  readonly page: Page;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.emailInput    = page.getByLabel('Email');
    this.passwordInput = page.getByLabel('Password');
    this.submitButton  = page.getByRole('button', { name: /sign in/i });
  }

  async goto() { await this.page.goto('/login'); }

  async login(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }
}
```

---

## Step 3 — Auth Fixtures (Firebase Auth)

Pre-authenticate ONCE and reuse storage state across tests for speed.

### `tests/e2e/setup/auth.setup.ts`

```ts
import { test as setup } from '@playwright/test';
import path from 'path';

const authFile = path.join(__dirname, '../.auth/user.json');

setup('authenticate', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Email').fill(process.env.TEST_USER_EMAIL!);
  await page.getByLabel('Password').fill(process.env.TEST_USER_PASSWORD!);
  await page.getByRole('button', { name: /sign in/i }).click();
  await page.waitForURL('/dashboard');
  await page.context().storageState({ path: authFile });
});
```

Reference in `playwright.config.ts` projects array:

```ts
projects: [
  { name: 'setup', testMatch: '**/setup/auth.setup.ts' },
  {
    name: 'chromium',
    use: {
      ...devices['Desktop Chrome'],
      storageState: 'tests/e2e/.auth/user.json',
    },
    dependencies: ['setup'],
  },
],
```

---

## Step 4 — Writing Specs

| Feature            | Spec file                           |
|--------------------|-------------------------------------|
| Auth flows         | tests/e2e/auth.spec.ts             |
| AI Co-Founder chat | tests/e2e/cofounder-chat.spec.ts   |
| Task Manager       | tests/e2e/task-manager.spec.ts     |
| Admin dashboard    | tests/e2e/admin.spec.ts            |
| Checkout           | tests/e2e/checkout.spec.ts         |

### Canonical spec template

```ts
import { test, expect } from '@playwright/test';
import { LoginPage } from './pages/LoginPage';

test.describe('Feature Name', () => {
  test('should do expected thing', async ({ page }) => {
    const login = new LoginPage(page);
    await login.goto();
    await login.login('user@test.com', 'password123');
    await expect(page).toHaveURL('/dashboard');
    await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible();
  });
});
```

---

## Step 5 — Locator Best Practices

Priority order (most → least resilient):

1. `getByRole('button', { name: /submit/i })`
2. `getByLabel('Email')`
3. `getByPlaceholder('Search...')`
4. `getByText('Submit')`
5. `getByTestId('submit-btn')`  ← add `data-testid` to JSX when needed
6. `locator('.css-class')`  ← avoid unless no better option

> **Ruhvi tip**: add `data-testid` to chat input, send button, task cards,
> and AI response container as you encounter them in tests.

---

## Step 6 — Environment Variables

Add to `.env.local` (already gitignored):

```
TEST_USER_EMAIL=testuser@ruhvi.in
TEST_USER_PASSWORD=YourTestPassword123
PLAYWRIGHT_BASE_URL=http://localhost:3000
```

> **IMPORTANT**: Never use production/admin credentials.
> Create a dedicated test account in Firebase Auth with limited permissions.

---

## Step 7 — Debugging

```powershell
# Show HTML report
npx playwright show-report

# Headed run with slow motion
npx playwright test --headed --slow-mo=500

# Trace viewer for a recorded trace zip
npx playwright show-trace test-results/.../trace.zip

# Step-through debugger for one spec
npx playwright test --debug tests/e2e/auth.spec.ts

# Record a test by clicking through the browser
npx playwright codegen http://localhost:3000
```

---

## Step 8 — CI (GitHub Actions)

Create `.github/workflows/playwright.yml`. Use GitHub repository secrets for all credentials. Reference them in the env block using the standard dollar-brace-brace notation (e.g., `${{ secrets.TEST_USER_EMAIL }}`).

Required GitHub secrets to configure:
- `TEST_USER_EMAIL`
- `TEST_USER_PASSWORD`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_FIREBASE_API_KEY`

Minimal CI job steps:
1. `actions/checkout@v4`
2. `actions/setup-node@v4` (node 20, cache: npm)
3. `npm ci`
4. `npx playwright install --with-deps`
5. `npm run build`
6. `npx playwright test`
7. `actions/upload-artifact@v4` for playwright-report/ (always)

---

## Step 9 — Ruhvi-Specific Test Patterns

### AI Co-Founder Chat

```ts
test('Co-Founder responds to a business question', async ({ page }) => {
  await page.goto('/co-founder');
  await page.getByTestId('chat-input').fill('What is my current MRR?');
  await page.getByRole('button', { name: /send/i }).click();
  // 30s timeout — AI streaming responses can be slow
  await expect(page.getByTestId('ai-response')).not.toBeEmpty({ timeout: 30_000 });
});
```

### Auth Redirect Guard

```ts
test('unauthenticated user is redirected to login', async ({ page }) => {
  await page.goto('/dashboard');
  await expect(page).toHaveURL(/\/login/);
});
```

### Task Manager

```ts
test('user can create a new task', async ({ page }) => {
  await page.goto('/tasks');
  await page.getByRole('button', { name: /new task/i }).click();
  await page.getByLabel('Task Title').fill('Fix checkout bug');
  await page.getByRole('button', { name: /create/i }).click();
  await expect(page.getByText('Fix checkout bug')).toBeVisible();
});
```

---

## Step 10 — .gitignore Additions

Add to `.gitignore` if not already present:

```
/playwright-report/
/test-results/
/tests/e2e/.auth/
```

---

## Merge Checklist

- [ ] Test uses POM (`tests/e2e/pages/`)
- [ ] Locators use `getByRole`, `getByLabel`, or `data-testid`
- [ ] Auth handled via storage state — no inline credentials
- [ ] No hardcoded production URLs or secrets
- [ ] Spec file named correctly in `tests/e2e/`
- [ ] `data-testid` attributes added to JSX where needed
