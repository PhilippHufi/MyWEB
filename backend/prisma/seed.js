import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function main() {
  const email = process.env.DEFAULT_USERNAME || process.env.DEFAULT_USER_EMAIL || 'admin';
  const password = process.env.DEFAULT_USER_PASSWORD || 'dashboard123';
  const passwordHash = await bcrypt.hash(password, 10);

  await prisma.user.upsert({
    where: { email },
    update: { passwordHash },
    create: { email, passwordHash }
  });

  if ((await prisma.task.count()) === 0) {
    await prisma.task.createMany({
      data: [
        { title: 'Monatsbudget pruefen', category: 'Finanzen', priority: 'hoch', dueDate: new Date(), notes: 'Fixkosten und Sparziel vergleichen' },
        { title: 'Urlaubsideen sammeln', category: 'Reisen', priority: 'mittel', dueDate: new Date(Date.now() + 86400000 * 10) }
      ]
    });
  }

  if ((await prisma.financeEntry.count()) === 0) {
    await prisma.financeEntry.createMany({
      data: [
        { type: 'income', category: 'Gehalt', amount: 2500, description: 'Monatliches Einkommen', date: new Date() },
        { type: 'expense', category: 'Lebensmittel', amount: 85.4, description: 'Wocheneinkauf', date: new Date() }
      ]
    });
  }
}

main()
  .finally(async () => {
    await prisma.$disconnect();
  });
