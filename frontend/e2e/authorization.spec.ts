import { test, expect } from '@playwright/test';
import { signInAs } from './helpers';

test.describe('Authorization', () => {
  test.beforeEach(async ({ page }) => {
    await signInAs(page, 'SUBMITTER');
  });

  test('submitters cannot access admin pages', async ({ page }) => {
    await page.goto('/users');
    
    await expect(page).toHaveURL('/dashboard');
  });

  test('submitters cannot access workflow management', async ({ page }) => {
    await page.goto('/workflows');
    
    await expect(page).toHaveURL('/dashboard');
  });

  test('submitters cannot access audit history', async ({ page }) => {
    await page.goto('/audit');
    
    await expect(page).toHaveURL('/dashboard');
  });
});

test.describe('Admin Authorization', () => {
  test.beforeEach(async ({ page }) => {
    await signInAs(page, 'ADMIN');
  });

  test('admin can access user management', async ({ page }) => {
    await page.goto('/users');
    
    await expect(page).toHaveURL('/users');
    await expect(page.locator('h1:has-text("User Management")')).toBeVisible();
  });

  test('admin sees role-specific navigation', async ({ page }) => {
    await expect(page.getByRole('link', { name: 'Admin Dashboard' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Manage Users / Roles' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Workflow Configuration & Approver Assignment' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'All Documents' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Audit History' })).toBeVisible();
  });

  test('admin can access workflow management', async ({ page }) => {
    await page.goto('/workflows');
    
    await expect(page).toHaveURL('/workflows');
    await expect(page.locator('h1:has-text("Workflow Management")')).toBeVisible();
  });

  test('admin can access audit history', async ({ page }) => {
    await page.goto('/audit');
    
    await expect(page).toHaveURL('/audit');
    await expect(page.locator('h1:has-text("Audit History")')).toBeVisible();
  });
});
