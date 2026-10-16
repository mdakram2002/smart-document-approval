import bcrypt from 'bcrypt';
import { ensureAdmin } from '../prisma/seed.js';
import { prisma } from '../src/db.js';

const adminEmail = process.env.E2E_ADMIN_EMAIL;
const adminPassword = process.env.E2E_ADMIN_PASSWORD;
const submitterEmail = process.env.E2E_SUBMITTER_EMAIL;
const submitterPassword = process.env.E2E_SUBMITTER_PASSWORD;
const approverEmail = process.env.E2E_APPROVER_EMAIL;
const approverPassword = process.env.E2E_APPROVER_PASSWORD;
const tag = process.env.E2E_FIXTURE_TAG;

async function createFixtures() {
  if (!adminEmail || !adminPassword || !submitterEmail || !submitterPassword || !approverEmail || !approverPassword || !tag) {
    throw new Error('Set all three E2E role credentials and E2E_FIXTURE_TAG before creating browser fixtures.');
  }
  await ensureAdmin(adminEmail, adminPassword, 'Browser Test Administrator');
  const [submitter, approver] = await Promise.all([
    prisma.user.create({ data: { email: submitterEmail, name: 'Browser Test Submitter', role: 'SUBMITTER', password: await bcrypt.hash(submitterPassword, 10) } }),
    prisma.user.create({ data: { email: approverEmail, name: 'Browser Test Approver', role: 'APPROVER', password: await bcrypt.hash(approverPassword, 10) } }),
  ]);
  const workflow = await prisma.workflowDefinition.create({ data: {
    name: `Browser fixture ${tag}`, category: `Browser-${tag}`,
    stages: { create: { stageOrder: 1, name: 'Browser review', approverAssignments: { create: { approverId: approver.id } } } },
  }, include: { stages: true } });
  const document = await prisma.document.create({ data: {
    title: `Browser fixture ${tag}`, description: 'Temporary browser-test document', category: `Browser-${tag}`,
    status: 'DRAFT', submitterId: submitter.id,
  } });
  const instance = await prisma.workflowInstance.create({ data: { documentId: document.id, workflowDefinitionId: workflow.id } });
  await prisma.$transaction([
    prisma.document.update({ where: { id: document.id }, data: { status: 'PENDING_APPROVAL', currentStage: 1, workflowInstanceId: instance.id, submittedAt: new Date() } }),
    prisma.approvalRecord.create({ data: { workflowInstanceId: instance.id, workflowStageId: workflow.stages[0].id, approverId: approver.id } }),
    prisma.notification.create({ data: { recipientId: approver.id, type: 'DOCUMENT_SUBMITTED', title: 'Browser test approval', message: 'Temporary browser workflow task', documentId: document.id } }),
    prisma.auditEntry.create({ data: { actorId: submitter.id, action: 'DOCUMENT_SUBMITTED', entityType: 'Document', entityId: document.id } }),
  ]);
  console.log('Temporary browser role fixtures created.');
}

async function removeFixtures() {
  if (!tag) throw new Error('Set E2E_FIXTURE_TAG before removing browser fixtures.');
  const emails = [adminEmail, submitterEmail, approverEmail].filter((email): email is string => Boolean(email));
  const users = await prisma.user.findMany({ where: { email: { in: emails } }, select: { id: true } });
  const userIds = users.map(({ id }) => id);
  const documents = await prisma.document.findMany({ where: { title: `Browser fixture ${tag}` }, select: { id: true } });
  const documentIds = documents.map(({ id }) => id);
  const workflows = await prisma.workflowDefinition.findMany({ where: { category: `Browser-${tag}` }, select: { id: true } });
  const workflowIds = workflows.map(({ id }) => id);
  await prisma.$transaction(async (tx) => {
    await tx.notification.deleteMany({ where: { OR: [{ recipientId: { in: userIds } }, { documentId: { in: documentIds } }] } });
    await tx.auditEntry.deleteMany({ where: { OR: [{ actorId: { in: userIds } }, { entityId: { in: documentIds } }] } });
    await tx.revokedAccessToken.deleteMany({ where: { userId: { in: userIds } } });
    if (documentIds.length) await tx.document.updateMany({ where: { id: { in: documentIds } }, data: { workflowInstanceId: null } });
    await tx.workflowInstance.deleteMany({ where: { documentId: { in: documentIds } } });
    await tx.document.deleteMany({ where: { id: { in: documentIds } } });
    await tx.workflowDefinition.deleteMany({ where: { id: { in: workflowIds } } });
    await tx.user.deleteMany({ where: { id: { in: userIds } } });
  });
  console.log('Temporary browser role fixtures removed.');
}

const action = process.argv[2];
try {
  if (action === 'create') await createFixtures();
  else if (action === 'remove') await removeFixtures();
  else throw new Error('Choose create or remove.');
} finally {
  await prisma.$disconnect();
}
