import { test, expect } from '@playwright/test';
import { signInAs } from './helpers';

test.describe('Approval Workflow', () => {
  test('approver can view pending tasks', async ({ page }) => {
    await signInAs(page, 'APPROVER');
    
    await page.goto('/my-approvals');
    
    await expect(page.locator('h1:has-text("My Approval Tasks")')).toBeVisible();
  });

  test('approver sees the pending approvals page', async ({ page }) => {
    await signInAs(page, 'APPROVER');
    await page.goto('/my-approvals');
    await expect(page.locator('h1:has-text("My Approval Tasks")')).toBeVisible();
  });

  test('document shows approval timeline', async ({ page }) => {
    await signInAs(page, 'SUBMITTER');
    
    await page.goto('/documents');
    
    const firstRow = page.locator('table tbody tr').first();
    await firstRow.locator('text=View').click();
    
    await expect(page.locator('text=Approval Timeline')).toBeVisible();
  });
});
