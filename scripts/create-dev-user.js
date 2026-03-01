/* eslint-disable no-console */
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const email = 'developer@perkasa.ner.id'; // sesuai permintaan
  const plain = '123456';

  // Pastikan minimal database/tables sudah ada
  console.log('[DEV] Verifying database connectivity...');
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch (e) {
    console.error('[DEV] Gagal konek ke database. Periksa DATABASE_URL di .env.local');
    throw e;
  }

  // Buat Employee minimal untuk relasi User
  const emp = await prisma.employee.upsert({
    where: { id: 'dev-employee-01' },
    update: {},
    create: {
      id: 'dev-employee-01',
      name: 'Developer Lokal',
      role: 'ADMIN',
      department: 'IT',
      status: 'Karyawan',
      baseSalary: 0,
      positionAllowance: 0,
    },
  });

  const hash = await bcrypt.hash(plain, 10);

  // Buat User admin untuk login lokal
  const user = await prisma.user.upsert({
    where: { email },
    update: {
      password: hash,
      name: 'Developer',
      role: 'ADMIN',
      employeeId: emp.id,
    },
    create: {
      email,
      password: hash,
      name: 'Developer',
      role: 'ADMIN',
      employeeId: emp.id,
    },
  });

  console.log('[DEV] User lokal siap:');
  console.log({ email: user.email, role: user.role, employeeId: user.employeeId });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });

