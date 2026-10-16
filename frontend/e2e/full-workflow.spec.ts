import { test, expect } from '@playwright/test';
import { signInAs } from './helpers';

test('two-stage document workflow completes with correct tasks, notices, history, and filtered dashboard', async ({ browser }) => {
  test.skip(
    process.env.E2E_ALLOW_DATABASE_WRITES !== 'true' || !process.env.E2E_FIXTURE_TAG,
    'Requires the isolated disposable database fixture.',
  );

  const tag = process.env.E2E_FIXTURE_TAG!;
  const title = `Acceptance document ${tag}`;
  const category = `Acceptance-${tag}`;
  const adminPage = await browser.newPage();
  const submitterPage = await browser.newPage();
  const firstApproverPage = await browser.newPage();
  const secondApproverPage = await browser.newPage();

  try {
    await signInAs(adminPage, 'ADMIN');
    await adminPage.goto('/workflows');
    await adminPage.getByRole('button', { name: 'New Workflow' }).click();
    const workflowForm = adminPage.locator('form');
    await workflowForm.locator('input').nth(0).fill(`Acceptance workflow ${tag}`);
    await workflowForm.locator('input').nth(1).fill(category);
    await workflowForm.getByRole('button', { name: 'Add stage' }).click();
    const approverSelects = workflowForm.locator('select[multiple]');
    await approverSelects.nth(0).selectOption({ label: `Browser Test Approver (${process.env.E2E_APPROVER_EMAIL})` });
    await approverSelects.nth(1).selectOption({ label: `Browser Test Approver Two (${process.env.E2E_APPROVER_TWO_EMAIL})` });
    await workflowForm.getByRole('button', { name: 'Create', exact: true }).click();
    await expect(adminPage.getByRole('heading', { name: `Acceptance workflow ${tag}` })).toBeVisible();

    await signInAs(submitterPage, 'SUBMITTER');
    await submitterPage.goto('/documents/create');
    await submitterPage.getByLabel('Title').fill(title);
    await submitterPage.getByLabel('Category').fill(category);
    await submitterPage.getByLabel('Description').fill('End-to-end two-stage approval acceptance document');
    await submitterPage.getByRole('button', { name: 'Create' }).click();
    await expect(submitterPage).toHaveURL(/\/documents\/[^/]+$/);
    const documentUrl = submitterPage.url();
    await submitterPage.getByRole('button', { name: 'Submit for Approval' }).click();
    await expect(submitterPage.getByText('PENDING APPROVAL')).toBeVisible();

    await signInAs(firstApproverPage, 'APPROVER');
    await signInAs(secondApproverPage, 'APPROVER_TWO');
    await secondApproverPage.goto('/notifications');
    await expect(secondApproverPage.getByText(title)).toHaveCount(0);
    await firstApproverPage.goto('/notifications');
    await expect(firstApproverPage.getByText(title)).toBeVisible();

    await secondApproverPage.goto(documentUrl);
    await expect(secondApproverPage.getByRole('button', { name: 'Approve' })).toHaveCount(0);
    await firstApproverPage.goto('/my-approvals');
    const firstTask = firstApproverPage.locator('div.bg-white.rounded-lg.shadow.p-6').filter({ hasText: title });
    await expect(firstTask).toBeVisible();
    await firstTask.getByRole('link', { name: 'Review Document' }).click();
    await expect(firstApproverPage.getByRole('button', { name: 'Approve' })).toBeVisible();
    await firstApproverPage.getByLabel('Approval comment').fill('Stage one approved in browser acceptance test');
    await firstApproverPage.getByRole('button', { name: 'Approve' }).click();
    await expect(firstApproverPage.getByText('Stage one approved in browser acceptance test')).toBeVisible();

    await secondApproverPage.goto('/notifications');
    await expect(secondApproverPage.getByText(title)).toBeVisible();
    await secondApproverPage.goto('/my-approvals');
    const secondTask = secondApproverPage.locator('div.bg-white.rounded-lg.shadow.p-6').filter({ hasText: title });
    await expect(secondTask).toBeVisible();
    await secondTask.getByRole('link', { name: 'Review Document' }).click();
    await secondApproverPage.getByLabel('Approval comment').fill('Stage two approved in browser acceptance test');
    await secondApproverPage.getByRole('button', { name: 'Approve' }).click();
    await expect(secondApproverPage.getByText('APPROVED', { exact: true }).first()).toBeVisible();
    await expect(secondApproverPage.getByText('Stage one approved in browser acceptance test')).toBeVisible();
    await expect(secondApproverPage.getByText('Stage two approved in browser acceptance test')).toBeVisible();

    await submitterPage.goto('/notifications');
    await expect(submitterPage.getByText(title)).toBeVisible();

    const apiUrl = `http://127.0.0.1:${process.env.E2E_BACKEND_PORT}/api/auth/me`;
    const submitterId = await submitterPage.evaluate(async (url) => {
      const accessToken = localStorage.getItem('accessToken');
      const response = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
      const user = await response.json();
      return user.id as string;
    }, apiUrl);
    await adminPage.goto('/dashboard');
    await adminPage.getByLabel('Status').selectOption('APPROVED');
    await adminPage.getByLabel('Category').fill(category);
    await adminPage.getByLabel('Submitter ID').fill(submitterId);
    const today = await adminPage.evaluate(() => new Date().toISOString().slice(0, 10));
    await adminPage.locator('input[type="date"]').nth(0).fill(today);
    await adminPage.locator('input[type="date"]').nth(1).fill(today);
    await adminPage.getByRole('button', { name: 'Apply filters' }).click();
    await expect(adminPage.getByText('Total Documents', { exact: true }).locator('..').getByText('1', { exact: true })).toBeVisible();
    await expect(adminPage.getByText('Approved', { exact: true }).locator('..').getByText('1', { exact: true })).toBeVisible();
  } finally {
    await Promise.all([adminPage.close(), submitterPage.close(), firstApproverPage.close(), secondApproverPage.close()]);
  }
});
