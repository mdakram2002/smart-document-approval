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

  test('admin can configure two sequential stages and assign approvers', async ({ page }) => {
    test.skip(process.env.E2E_ALLOW_DATABASE_WRITES !== 'true', 'Workflow configuration writes to the database; enable only for a disposable test database.');
    test.skip(!process.env.E2E_FIXTURE_TAG || !process.env.E2E_APPROVER_EMAIL || !process.env.E2E_APPROVER_TWO_EMAIL, 'Temporary E2E approver fixtures are required.');
    await page.goto('/workflows');
    await page.getByRole('button', { name: 'New Workflow' }).click();
    const form = page.locator('form');
    const workflowName = `Browser two-stage ${process.env.E2E_FIXTURE_TAG}`;
    await form.locator('input').nth(0).fill(workflowName);
    await form.locator('input').nth(1).fill(`Browser-${process.env.E2E_FIXTURE_TAG}`);
    await form.getByRole('button', { name: 'Add stage' }).click();
    const approverSelects = form.locator('select[multiple]');
    await approverSelects.nth(0).selectOption({ label: `Browser Test Approver (${process.env.E2E_APPROVER_EMAIL})` });
    await approverSelects.nth(1).selectOption({ label: `Browser Test Approver Two (${process.env.E2E_APPROVER_TWO_EMAIL})` });
    await form.getByRole('button', { name: 'Create', exact: true }).click();
    await expect(page.getByRole('heading', { name: workflowName })).toBeVisible();
    const workflowCard = page.locator('div.bg-white.rounded-lg.shadow.p-6').filter({ has: page.getByRole('heading', { name: workflowName }) });
    await expect(workflowCard.getByText('Stages: 2', { exact: true })).toBeVisible();
  });

  test('admin can access audit history', async ({ page }) => {
    await page.goto('/audit');
    
    await expect(page).toHaveURL('/audit');
    await expect(page.locator('h1:has-text("Audit History")')).toBeVisible();
  });
});
