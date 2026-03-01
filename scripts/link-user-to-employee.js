/* eslint-disable no-console */
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const email = 'indra@perkasa.net.id';
  console.log('[LINK] Menautkan user ke employee untuk:', email);

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    console.log('[LINK] User tidak ditemukan.');
    return;
  }
  if (user.employeeId) {
    console.log('[LINK] User sudah memiliki employeeId:', user.employeeId);
    return;
  }

  // Cari employee dengan nama yang mirip nama user
  let emp = null;
  if (user.name) {
    emp = await prisma.employee.findFirst({ where: { name: user.name } });
  }
  if (!emp) {
    // fallback: ambil karyawan pertama (tidak ideal, namun membantu dev)
    const employees = await prisma.employee.findMany({ orderBy: { createdAt: 'asc' } });
    emp = employees[0] || null;
  }
  if (!emp) {
    console.log('[LINK] Tidak ada employee di database.');
    return;
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { employeeId: emp.id },
  });
  console.log('[LINK] Berhasil tautkan user', email, '-> employee', emp.id, emp.name);
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

