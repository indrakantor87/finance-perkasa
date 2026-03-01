/* eslint-disable no-console */
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const email = 'developer@perkasa.net.id';
  const plain = '123456';

  console.log('[DEV] Updating password for:', email);
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch (e) {
    console.error('[DEV] Gagal konek ke database. Periksa DATABASE_URL di .env / .env.local');
    throw e;
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    console.log('[DEV] User belum ada. Membuat user baru sebagai ADMIN...');
    const hash = await bcrypt.hash(plain, 10);

    // Buat employee minimal agar relasi tidak null
    const emp = await prisma.employee.upsert({
      where: { id: 'dev-employee-02' },
      update: {},
      create: {
        id: 'dev-employee-02',
        name: 'Developer Admin',
        role: 'ADMIN',
        department: 'IT',
        status: 'Karyawan',
      },
    });

    const created = await prisma.user.create({
      data: {
        email,
        password: hash,
        name: 'Developer',
        role: 'DEVELOPER',
        employeeId: emp.id,
      },
    });
    console.log('[DEV] User dibuat:', { email: created.email, role: created.role });
  } else {
    const hash = await bcrypt.hash(plain, 10);
    await prisma.user.update({
      where: { email },
      data: { password: hash, role: 'DEVELOPER' },
    });
    console.log('[DEV] Password diperbarui untuk', email);
  }
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
