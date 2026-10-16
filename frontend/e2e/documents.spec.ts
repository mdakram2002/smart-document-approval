import { test, expect } from '@playwright/test';
import { signInAs } from './helpers';

test.describe('Document Management', () => {
  test.beforeEach(async ({ page }) => {
    await signInAs(page, 'SUBMITTER');
  });

  test('submitter can create a document', async ({ page }) => {
    test.skip(process.env.E2E_ALLOW_DATABASE_WRITES !== 'true', 'Requires an explicitly enabled test database because document creation writes data.');
    await page.goto('/documents/create');
    
    const title = `E2E Document ${Date.now()}`;
    await page.fill('input[name="title"]', title);
    await page.fill('input[name="category"]', 'Test Category');
    await page.fill('textarea[name="description"]', 'This is a test document description');
    
    await page.click('button:has-text("Create")');
    
    await expect(page).toHaveURL('/documents');
    await expect(page.locator(`text=${title}`)).toBeVisible();
  });

  test('submitter can view their documents', async ({ page }) => {
    await page.goto('/documents');
    
    await expect(page.locator('h1:has-text("Documents")')).toBeVisible();
    
    const documentCount = await page.locator('table tbody tr').count();
    expect(documentCount).toBeGreaterThan(0);
  });

  test('submitter can edit a draft document', async () => {
    test.skip(true, 'Editing an existing draft requires an isolated workflow fixture; the former test edited arbitrary user data.');
  });

  test('document list shows filters', async ({ page }) => {
    await page.goto('/documents');
    
    await expect(page.locator('select')).toBeVisible();
    
    await page.selectOption('select', 'DRAFT');
    
    await page.waitForTimeout(500);
  });
});
