import 'dotenv/config';
import { UserRole, UserStatus } from '@prisma/client-runtime-v2';
import bcrypt from 'bcrypt';
import { pathToFileURL } from 'url';
import { prisma } from '../src/db.js';

export async function ensureAdmin(emailValue: string | undefined, password: string | undefined, nameValue?: string) {
  const email = emailValue?.trim().toLowerCase();
  const name = nameValue?.trim() || 'System Administrator';
  const problems: string[] = [];
  if (!email) problems.push('SEED_ADMIN_EMAIL is missing');
  else if (!email.includes('@') || email.endsWith('@example.test')) problems.push('SEED_ADMIN_EMAIL must be a valid, non-example address');
  if (!password) problems.push('SEED_ADMIN_PASSWORD is missing');
  else if (password.length < 12) problems.push('SEED_ADMIN_PASSWORD must be at least 12 characters');
  else if (password.toLowerCase().includes('replace-with-')) problems.push('SEED_ADMIN_PASSWORD is still the .env.example placeholder');
  if (problems.length) {
    throw new Error(`${problems.join('; ')}. Edit backend/.env (not .env.example) and rerun npm run prisma:seed.`);
  }

  const hashed = await bcrypt.hash(password, 12);
  await prisma.user.upsert({
    where: { email },
    create: { email, name, password: hashed, role: UserRole.ADMIN, status: UserStatus.ACTIVE },
    update: { name, password: hashed, role: UserRole.ADMIN, status: UserStatus.ACTIVE },
  });
  return email;
}

async function main() {
  const email = await ensureAdmin(process.env.SEED_ADMIN_EMAIL, process.env.SEED_ADMIN_PASSWORD, process.env.SEED_ADMIN_NAME);
  console.log(`Administrator ensured: ${email}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(async () => prisma.$disconnect());
}
