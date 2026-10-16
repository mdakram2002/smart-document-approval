import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { randomUUID } from 'node:crypto';
import { unlink } from 'node:fs/promises';

process.env.NODE_ENV = 'test';

const { default: app } = await import('../src/index.js');
const { prisma } = await import('../src/db.js');
const { ensureAdmin } = await import('../prisma/seed.ts');

type ApiResult = { status: number; body: any };
const enabled = process.env.RUN_DB_INTEGRATION_TESTS === 'true';

test('database-backed auth, workflow, permissions, filters, notifications, audit, and logout', { skip: !enabled && 'Set RUN_DB_INTEGRATION_TESTS=true to use the configured PostgreSQL database.' }, async () => {
  const tag = randomUUID();
  const email = (role: string) => `edvexa-${role}-${tag}@integration.invalid`;
  const adminEmail = email('admin');
  const testPassword = `I-${randomUUID()}-Secure!`;
  let adminId: string | undefined;
  const userIds: string[] = [];
  const workflowIds: string[] = [];
  const documentIds: string[] = [];
  let server: ReturnType<typeof app.listen> | undefined;
  let baseUrl = '';

  const call = async (path: string, token?: string, init: RequestInit = {}): Promise<ApiResult> => {
    const response = await fetch(`${baseUrl}/api${path}`, {
      ...init,
      headers: { ...(init.body ? { 'content-type': 'application/json' } : {}), ...(token ? { authorization: `Bearer ${token}` } : {}), ...init.headers },
    });
    const text = await response.text();
    return { status: response.status, body: text ? JSON.parse(text) : null };
  };
  const expectStatus = (result: ApiResult, expected: number) => assert.equal(result.status, expected, JSON.stringify(result.body));
  const login = async (userEmail: string, password: string) => {
    const response = await call('/auth/login', undefined, { method: 'POST', body: JSON.stringify({ email: userEmail, password }) });
    expectStatus(response, 200);
    return response.body as { user: { id: string; role: string }; accessToken: string };
  };
  const register = async (userEmail: string, name: string) => {
    const result = await call('/auth/register', undefined, { method: 'POST', body: JSON.stringify({ email: userEmail, password: testPassword, name, role: 'ADMIN' }) });
    expectStatus(result, 201);
    assert.equal(result.body.role, 'SUBMITTER');
    userIds.push(result.body.id);
    return result.body as { id: string; email: string; role: string };
  };

  try {
    await ensureAdmin(adminEmail, testPassword, 'Integration Admin');
    const admin = await prisma.user.findUniqueOrThrow({ where: { email: adminEmail } });
    adminId = admin.id;
    userIds.push(admin.id);
    server = app.listen(0, '127.0.0.1');
    await once(server, 'listening');
    const address = server.address();
    assert.ok(address && typeof address !== 'string');
    baseUrl = `http://127.0.0.1:${address.port}`;

    const adminSession = await login(adminEmail, testPassword);
    assert.equal(adminSession.user.role, 'ADMIN');
    expectStatus(await call('/auth/login', undefined, { method: 'POST', body: JSON.stringify({ email: adminEmail, password: 'incorrect-password' }) }), 401);
    expectStatus(await call('/documents'), 401);
    expectStatus(await call('/auth/register', undefined, { method: 'POST', body: JSON.stringify({ email: 'bad-email', password: 'weak', name: 'Invalid' }) }), 400);
    const submitter = await register(email('submitter'), 'Test Submitter');
    const approver1 = await register(email('approver1'), 'Test Approver One');
    const approver2 = await register(email('approver2'), 'Test Approver Two');
    const inactiveApprover = await register(email('inactive'), 'Inactive Approver');
    const outsider = await register(email('outsider'), 'Outside Submitter');

    for (const user of [approver1, approver2, inactiveApprover]) {
      expectStatus(await call(`/users/${user.id}`, adminSession.accessToken, { method: 'PATCH', body: JSON.stringify({ role: 'APPROVER' }) }), 200);
    }
    expectStatus(await call(`/users/${inactiveApprover.id}/status`, adminSession.accessToken, { method: 'PATCH', body: JSON.stringify({ status: 'INACTIVE' }) }), 200);
    const submitterSession = await login(submitter.email, testPassword);
    const approver1Session = await login(approver1.email, testPassword);
    const approver2Session = await login(approver2.email, testPassword);
    const outsiderSession = await login(outsider.email, testPassword);

    expectStatus(await call('/workflows', submitterSession.accessToken), 403);
    expectStatus(await call('/documents', adminSession.accessToken, { method: 'POST', body: JSON.stringify({ title: 'Admin must not submit', description: 'Not a submitter action', category: 'Integration' }) }), 403);
    const badWorkflow = await call('/workflows', adminSession.accessToken, { method: 'POST', body: JSON.stringify({ name: 'Must fail', category: 'Integration', stages: [{ name: 'Only stage', approverIds: [inactiveApprover.id] }] }) });
    expectStatus(badWorkflow, 400);
    assert.equal(await prisma.workflowDefinition.findFirst({ where: { name: 'Must fail' } }), null, 'invalid workflow transaction must roll back');
    const createdWorkflow = await call('/workflows', adminSession.accessToken, { method: 'POST', body: JSON.stringify({ name: 'Integration two stage', category: 'Integration', stages: [{ name: 'Manager review', approverIds: [approver1.id] }, { name: 'Director review', approverIds: [approver2.id] }] }) });
    expectStatus(createdWorkflow, 201);
    workflowIds.push(createdWorkflow.body.id);
    expectStatus(await call(`/workflows/${createdWorkflow.body.id}`, adminSession.accessToken, { method: 'PATCH', body: JSON.stringify({ name: 'Integration two stage revised' }) }), 200);

    const createDocument = async (title: string) => {
      const result = await call('/documents', submitterSession.accessToken, { method: 'POST', body: JSON.stringify({ title: `${title} ${tag}`, description: 'Integration document', category: 'Integration' }) });
      expectStatus(result, 201);
      documentIds.push(result.body.id);
      return result.body as { id: string; status: string };
    };
    expectStatus(await call('/documents', submitterSession.accessToken, { method: 'POST', body: JSON.stringify({ description: 'Missing title and category' }) }), 400);
    expectStatus(await call(`/documents/${randomUUID()}`, submitterSession.accessToken), 404);
    const submit = async (documentId: string) => expectStatus(await call(`/documents/${documentId}/submit`, submitterSession.accessToken, { method: 'POST' }), 200);
    const recordsFor = async (documentId: string) => {
      const document = await prisma.document.findUniqueOrThrow({ where: { id: documentId } });
      return prisma.approvalRecord.findMany({ where: { workflowInstanceId: document.workflowInstanceId! }, include: { workflowStage: true }, orderBy: { workflowStage: { stageOrder: 'asc' } } });
    };

    const sequentialDoc = await createDocument('Sequential');
    const draftEdit = await call(`/documents/${sequentialDoc.id}`, submitterSession.accessToken, { method: 'PATCH', body: JSON.stringify({ description: 'Edited before submission' }) });
    expectStatus(draftEdit, 200);
    assert.equal(draftEdit.body.version, 2);
    const uploadForm = new FormData();
    uploadForm.append('file', new Blob(['integration attachment'], { type: 'text/plain' }), `attachment-${tag}.txt`);
    const unsupportedForm = new FormData();
    unsupportedForm.append('file', new Blob(['not a supported document'], { type: 'application/octet-stream' }), `unsupported-${tag}.exe`);
    const unsupportedUpload = await fetch(`${baseUrl}/api/documents/${sequentialDoc.id}/attachments`, { method: 'POST', headers: { authorization: `Bearer ${submitterSession.accessToken}` }, body: unsupportedForm });
    assert.equal(unsupportedUpload.status, 400);
    const uploadResponse = await fetch(`${baseUrl}/api/documents/${sequentialDoc.id}/attachments`, { method: 'POST', headers: { authorization: `Bearer ${submitterSession.accessToken}` }, body: uploadForm });
    const uploadedAttachment = await uploadResponse.json();
    assert.equal(uploadResponse.status, 201, JSON.stringify(uploadedAttachment));
    assert.equal(uploadedAttachment.originalName, `attachment-${tag}.txt`);
    assert.equal(Object.hasOwn(uploadedAttachment, 'path'), false, 'server filesystem path must not be returned');
    const downloadResponse = await fetch(`${baseUrl}/api/documents/${sequentialDoc.id}/attachments/${uploadedAttachment.id}`, { headers: { authorization: `Bearer ${submitterSession.accessToken}` } });
    assert.equal(downloadResponse.status, 200);
    assert.equal(await downloadResponse.text(), 'integration attachment');
    const unauthorizedDownload = await fetch(`${baseUrl}/api/documents/${sequentialDoc.id}/attachments/${uploadedAttachment.id}`, { headers: { authorization: `Bearer ${outsiderSession.accessToken}` } });
    assert.equal(unauthorizedDownload.status, 403);
    await submit(sequentialDoc.id);
    expectStatus(await call(`/workflows/${createdWorkflow.body.id}`, adminSession.accessToken, { method: 'PATCH', body: JSON.stringify({ stages: [{ name: 'Changed after use', approverIds: [approver1.id] }] }) }), 409);
    expectStatus(await call(`/users/${approver2.id}/status`, adminSession.accessToken, { method: 'PATCH', body: JSON.stringify({ status: 'INACTIVE' }) }), 409);
    expectStatus(await call(`/users/${approver2.id}`, adminSession.accessToken, { method: 'PATCH', body: JSON.stringify({ role: 'SUBMITTER' }) }), 409);
    expectStatus(await call(`/documents/${sequentialDoc.id}`, outsiderSession.accessToken), 403);
    const firstNotifications = await call('/notifications', approver1Session.accessToken);
    expectStatus(firstNotifications, 200);
    assert.ok(firstNotifications.body.notifications.some((notification: any) => notification.documentId === sequentialDoc.id));
    const secondInitialNotifications = await call('/notifications?unreadOnly=true', approver2Session.accessToken);
    assert.equal(secondInitialNotifications.body.notifications.some((notification: any) => notification.documentId === sequentialDoc.id), false);

    const sequentialRecords = await recordsFor(sequentialDoc.id);
    const firstTask = sequentialRecords.find((record) => record.approverId === approver1.id)!;
    const secondTask = sequentialRecords.find((record) => record.approverId === approver2.id)!;
    expectStatus(await call(`/approvals/${firstTask.id}/approve`, approver2Session.accessToken, { method: 'POST', body: JSON.stringify({ comment: 'Wrong actor' }) }), 403);
    expectStatus(await call(`/approvals/${firstTask.id}/approve`, adminSession.accessToken, { method: 'POST', body: JSON.stringify({ comment: 'Admin cannot approve' }) }), 403);
    expectStatus(await call(`/approvals/${secondTask.id}/approve`, approver2Session.accessToken, { method: 'POST', body: JSON.stringify({ comment: 'Out of order' }) }), 409);
    const simultaneousDecisions = await Promise.all([
      call(`/approvals/${firstTask.id}/approve`, approver1Session.accessToken, { method: 'POST', body: JSON.stringify({ comment: 'Looks good for stage two' }) }),
      call(`/approvals/${firstTask.id}/approve`, approver1Session.accessToken, { method: 'POST', body: JSON.stringify({ comment: 'Conflicting duplicate action' }) }),
    ]);
    assert.deepEqual(simultaneousDecisions.map(({ status }) => status).sort(), [200, 409]);
    const acceptedDecision = simultaneousDecisions.find(({ status }) => status === 200)!;
    expectStatus(await call(`/approvals/${firstTask.id}/approve`, approver1Session.accessToken, { method: 'POST', body: JSON.stringify({ comment: 'Duplicate' }) }), 409);
    assert.equal((await prisma.document.findUniqueOrThrow({ where: { id: sequentialDoc.id } })).currentStage, 2);
    assert.ok((await call('/notifications', approver2Session.accessToken)).body.notifications.some((notification: any) => notification.documentId === sequentialDoc.id));
    expectStatus(await call(`/approvals/${secondTask.id}/approve`, approver2Session.accessToken, { method: 'POST', body: JSON.stringify({ comment: 'Final approval' }) }), 200);
    assert.equal((await call(`/documents/${sequentialDoc.id}`, submitterSession.accessToken)).body.status, 'APPROVED');
    assert.ok((await call('/notifications', submitterSession.accessToken)).body.notifications.some((notification: any) => notification.documentId === sequentialDoc.id && notification.type === 'DOCUMENT_APPROVED'));
    const history = await call(`/documents/${sequentialDoc.id}/history`, submitterSession.accessToken);
    assert.ok(history.body.some((entry: any) => entry.action === 'DOCUMENT_SUBMITTED'));
    assert.ok(history.body.some((entry: any) => entry.action === 'DOCUMENT_APPROVED' && entry.metadata?.includes(acceptedDecision.body.comment)));

    const rejectedDoc = await createDocument('Rejected');
    await submit(rejectedDoc.id);
    const rejectedTask = (await recordsFor(rejectedDoc.id)).find((record) => record.approverId === approver1.id)!;
    expectStatus(await call(`/approvals/${rejectedTask.id}/reject`, approver1Session.accessToken, { method: 'POST', body: JSON.stringify({ comment: '' }) }), 400);
    expectStatus(await call(`/approvals/${rejectedTask.id}/reject`, approver1Session.accessToken, { method: 'POST', body: JSON.stringify({ comment: 'Budget does not meet policy' }) }), 200);
    assert.equal((await call(`/documents/${rejectedDoc.id}`, submitterSession.accessToken)).body.status, 'REJECTED');
    assert.ok((await recordsFor(rejectedDoc.id)).every((record) => record.decision !== 'PENDING'));
    assert.ok((await call('/notifications', submitterSession.accessToken)).body.notifications.some((notification: any) => notification.documentId === rejectedDoc.id && notification.type === 'DOCUMENT_REJECTED'));
    assert.ok((await call('/notifications', approver2Session.accessToken)).body.notifications.some((notification: any) => notification.documentId === rejectedDoc.id && notification.type === 'APPROVAL_CANCELLED'));

    const returnedDoc = await createDocument('Returned');
    await submit(returnedDoc.id);
    const returnedTask = (await recordsFor(returnedDoc.id)).find((record) => record.approverId === approver1.id)!;
    expectStatus(await call(`/approvals/${returnedTask.id}/return`, approver1Session.accessToken, { method: 'POST', body: JSON.stringify({ comment: 'Attach the signed estimate' }) }), 200);
    assert.equal((await call(`/documents/${returnedDoc.id}`, submitterSession.accessToken)).body.status, 'RETURNED_FOR_CHANGES');
    assert.ok((await recordsFor(returnedDoc.id)).every((record) => record.decision !== 'PENDING'));
    expectStatus(await call(`/documents/${returnedDoc.id}`, outsiderSession.accessToken, { method: 'PATCH', body: JSON.stringify({ title: 'Forbidden edit' }) }), 403);
    expectStatus(await call(`/documents/${returnedDoc.id}`, adminSession.accessToken, { method: 'PATCH', body: JSON.stringify({ title: 'Admin must not edit submitter records' }) }), 403);
    expectStatus(await call(`/documents/${returnedDoc.id}`, submitterSession.accessToken, { method: 'PATCH', body: JSON.stringify({ description: 'Updated with the signed estimate' }) }), 200);
    await submit(returnedDoc.id);
    let currentRevision = await prisma.workflowInstance.findFirstOrThrow({ where: { documentId: returnedDoc.id }, orderBy: { revisionNumber: 'desc' } });
    assert.equal(currentRevision.revisionNumber, 2);
    const returnedRevisionTasks = await recordsFor(returnedDoc.id);
    for (const approver of [approver1Session, approver2Session]) {
      const task = returnedRevisionTasks.find((record) => record.approverId === approver.user.id)!;
      expectStatus(await call(`/approvals/${task.id}/approve`, approver.accessToken, { method: 'POST', body: JSON.stringify({ comment: 'Resubmission reviewed' }) }), 200);
    }
    assert.equal((await call(`/documents/${returnedDoc.id}`, submitterSession.accessToken)).body.status, 'APPROVED');
    const returnedHistory = await call(`/documents/${returnedDoc.id}/history`, submitterSession.accessToken);
    assert.ok(returnedHistory.body.some((entry: any) => entry.action === 'DOCUMENT_RETURNED' && entry.metadata?.includes('Attach the signed estimate')));
    assert.ok((await call('/notifications', submitterSession.accessToken)).body.notifications.some((notification: any) => notification.documentId === returnedDoc.id && notification.type === 'DOCUMENT_RETURNED'));

    const withdrawnDoc = await createDocument('Withdrawn');
    await submit(withdrawnDoc.id);
    expectStatus(await call(`/documents/${withdrawnDoc.id}/withdraw`, outsiderSession.accessToken, { method: 'POST' }), 403);
    expectStatus(await call(`/documents/${withdrawnDoc.id}/withdraw`, submitterSession.accessToken, { method: 'POST' }), 200);
    assert.ok((await recordsFor(withdrawnDoc.id)).every((record) => record.decision === 'CANCELLED'));
    assert.ok((await call('/notifications', approver1Session.accessToken)).body.notifications.some((notification: any) => notification.documentId === withdrawnDoc.id && notification.type === 'DOCUMENT_WITHDRAWN'));

    const listByFilter = await call(`/documents?status=APPROVED&category=Integration&submitterId=${submitter.id}&from=2020-01-01&to=2099-01-01`, adminSession.accessToken);
    expectStatus(listByFilter, 200);
    assert.ok(listByFilter.body.documents.some((document: any) => document.id === sequentialDoc.id));
    assert.ok(listByFilter.body.documents.some((document: any) => document.id === returnedDoc.id));
    const dashboard = await call(`/dashboard/summary?status=APPROVED&category=Integration&submitterId=${submitter.id}&from=2020-01-01&to=2099-01-01`, adminSession.accessToken);
    expectStatus(dashboard, 200);
    assert.equal(dashboard.body.totalDocuments, 2);
    assert.equal(dashboard.body.approvedDocuments, 2);
    const today = new Date().toISOString().slice(0, 10);
    const todayDashboard = await call(`/dashboard/summary?category=Integration&submitterId=${submitter.id}&from=${today}&to=${today}`, adminSession.accessToken);
    expectStatus(todayDashboard, 200);
    assert.equal(todayDashboard.body.totalDocuments, 4);
    assert.equal((await call(`/documents?category=Integration&submitterId=${submitter.id}&from=${today}&to=${today}`, adminSession.accessToken)).body.documents.length, 4);
    expectStatus(await call('/documents?status=NOT_A_STATUS', adminSession.accessToken), 400);
    const completeDashboard = await call('/dashboard/summary?category=Integration', adminSession.accessToken);
    expectStatus(completeDashboard, 200);
    assert.equal(completeDashboard.body.pendingDocuments, 0);
    assert.equal(completeDashboard.body.pendingApprovals, 0);
    expectStatus(await call('/dashboard/summary?from=2099-01-01&to=2020-01-01', adminSession.accessToken), 400);

    const readNotice = firstNotifications.body.notifications.find((notification: any) => notification.documentId === sequentialDoc.id);
    expectStatus(await call(`/notifications/${readNotice.id}/read`, approver2Session.accessToken, { method: 'PATCH' }), 403);
    expectStatus(await call(`/notifications/${readNotice.id}/read`, approver1Session.accessToken, { method: 'PATCH' }), 200);
    assert.equal((await call('/notifications?unreadOnly=true', approver1Session.accessToken)).body.notifications.some((notification: any) => notification.id === readNotice.id), false);
    assert.ok((await call('/audit-logs?limit=500', adminSession.accessToken)).status === 400);

    expectStatus(await call('/auth/logout', outsiderSession.accessToken, { method: 'POST' }), 200);
    expectStatus(await call('/auth/me', outsiderSession.accessToken), 401);
    const logoutAudit = await call(`/audit-logs?actorId=${outsider.id}`, adminSession.accessToken);
    assert.ok(logoutAudit.body.auditEntries.some((entry: any) => entry.action === 'LOGOUT'));
    assert.ok(adminId);
  } finally {
    if (server) await new Promise<void>((resolve) => server!.close(() => resolve()));
    if (userIds.length) {
      const attachmentFiles = await prisma.attachment.findMany({ where: { documentId: { in: documentIds } }, select: { path: true } });
      await Promise.all(attachmentFiles.map(({ path }) => unlink(path).catch(() => undefined)));
      await prisma.$transaction(async (tx) => {
        await tx.notification.deleteMany({ where: { OR: [{ recipientId: { in: userIds } }, { documentId: { in: documentIds } }] } });
        await tx.auditEntry.deleteMany({ where: { OR: [{ actorId: { in: userIds } }, { entityId: { in: [...documentIds, ...workflowIds] } }] } });
        await tx.revokedAccessToken.deleteMany({ where: { userId: { in: userIds } } });
        if (documentIds.length) {
          await tx.document.updateMany({ where: { id: { in: documentIds } }, data: { workflowInstanceId: null } });
          await tx.workflowInstance.deleteMany({ where: { documentId: { in: documentIds } } });
          await tx.document.deleteMany({ where: { id: { in: documentIds } } });
        }
        if (workflowIds.length) await tx.workflowDefinition.deleteMany({ where: { id: { in: workflowIds } } });
        await tx.user.deleteMany({ where: { id: { in: userIds } } });
      });
    }
    await prisma.$disconnect();
  }
});
