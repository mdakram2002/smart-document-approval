import { test, expect } from '@playwright/test';
import { signInAs } from './helpers';

test.describe('Document Management', () => {
  test.beforeEach(async ({ page }) => {
    await signInAs(page, 'SUBMITTER');
  });

  test('submitter can create a document', async ({ page }) => {
    test.skip(process.env.E2E_ALLOW_DATABASE_WRITES !== 'true', 'Requires an explicitly enabled test database because document creation writes data.');
    await page.goto('/documents/create');
    
    const title = `E2E Document ${process.env.E2E_FIXTURE_TAG} ${Date.now()}`;
    await page.getByLabel('Title').fill(title);
    await page.getByLabel('Category').fill('Test Category');
    await page.getByLabel('Description').fill('This is a test document description');
    
    await page.click('button:has-text("Create")');
    
    await expect(page).toHaveURL(/\/documents\/[^/]+$/);
    await expect(page.getByRole('heading', { name: title })).toBeVisible();
  });

  test('submitter can view their documents', async ({ page }) => {
    await page.goto('/documents');
    
    await expect(page.locator('h1:has-text("Documents")')).toBeVisible();
    
    const documentCount = await page.locator('table tbody tr').count();
    expect(documentCount).toBeGreaterThan(0);
  });

  test('submitter can edit their isolated draft document', async ({ page }) => {
    test.skip(process.env.E2E_ALLOW_DATABASE_WRITES !== 'true' || !process.env.E2E_FIXTURE_TAG, 'Requires the isolated disposable database fixture.');
    const title = `Browser draft fixture ${process.env.E2E_FIXTURE_TAG}`;
    await page.goto('/documents');
    const row = page.locator('table tbody tr').filter({ hasText: title });
    await expect(row).toBeVisible();
    await row.getByRole('link', { name: 'View' }).click();
    await page.getByRole('button', { name: 'Edit' }).click();
    await page.getByLabel('Title').fill(`${title} edited`);
    await page.getByRole('button', { name: 'Save changes' }).click();
    await expect(page.getByRole('heading', { name: `${title} edited` })).toBeVisible();
  });

  test('document list shows filters', async ({ page }) => {
    await page.goto('/documents');
    
    await expect(page.locator('select')).toBeVisible();
    
    await page.selectOption('select', 'DRAFT');
    
    await page.waitForTimeout(500);
  });
});
