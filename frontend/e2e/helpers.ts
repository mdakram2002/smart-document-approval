import { test, type Page } from '@playwright/test';

export async function signInAs(page: Page, role: 'ADMIN' | 'SUBMITTER' | 'APPROVER' | 'APPROVER_TWO') {
  const email = process.env[`E2E_${role}_EMAIL`];
  const password = process.env[`E2E_${role}_PASSWORD`];
  test.skip(!email || !password, `Set E2E_${role}_EMAIL and E2E_${role}_PASSWORD for this role test.`);
  await page.goto('/login');
  await page.fill('input[name="email"]', email!);
  await page.fill('input[name="password"]', password!);
  await page.click('button[type="submit"]');
  await page.waitForURL('/dashboard');
}
