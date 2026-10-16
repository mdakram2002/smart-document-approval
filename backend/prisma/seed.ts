import 'dotenv/config';
import { PrismaClient, UserRole, UserStatus } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const email = process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD;
  const name = process.env.SEED_ADMIN_NAME?.trim() || 'System Administrator';
  if (!email || !password || password.length < 12 || email.endsWith('@example.test') || password.includes('replace-with-')) {
    throw new Error('Set a real development email and a unique SEED_ADMIN_PASSWORD (at least 12 characters) in backend/.env before running the seed. Do not use the .env.example placeholders.');
  }

  const hashed = await bcrypt.hash(password, 12);
  await prisma.user.upsert({
    where: { email },
    create: { email, name, password: hashed, role: UserRole.ADMIN, status: UserStatus.ACTIVE },
    update: { name, password: hashed, role: UserRole.ADMIN, status: UserStatus.ACTIVE },
  });
  console.log(`Administrator ensured: ${email}`);
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(async () => prisma.$disconnect());
