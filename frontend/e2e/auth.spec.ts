import { test, expect } from '@playwright/test';
import { signInAs } from './helpers';

test.describe('Authentication', () => {
  test('user can register and login', async ({ page }) => {
    test.skip(process.env.E2E_ALLOW_DATABASE_WRITES !== 'true', 'Requires an explicitly enabled test database because registration writes a user.');
    const email = `e2e-${process.env.E2E_FIXTURE_TAG}-${Date.now()}@example.test`;
    const password = `Test-${Date.now()}-Password`;
    await page.goto('/register');
    
    await page.fill('input[name="name"]', 'Test User');
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', password);
    
    await page.click('button[type="submit"]');
    
    await expect(page).toHaveURL('/login');
    
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', password);
    
    await page.click('button[type="submit"]');
    
    await expect(page).toHaveURL('/dashboard');
  });

  test('invalid credentials are rejected', async ({ page }) => {
    await page.goto('/login');
    
    await page.fill('input[name="email"]', 'wrong@example.com');
    await page.fill('input[name="password"]', 'wrongpassword');
    
    await page.click('button[type="submit"]');
    
    await expect(page.locator('text=Invalid credentials')).toBeVisible();
  });

  test('unauthenticated users cannot access protected pages', async ({ page }) => {
    await page.goto('/dashboard');
    
    await expect(page).toHaveURL('/login');
  });

  test('user can logout', async ({ page }) => {
    await signInAs(page, 'SUBMITTER');
    await page.getByRole('button', { name: 'Logout' }).click();
    
    await expect(page).toHaveURL('/login');
  });
});
