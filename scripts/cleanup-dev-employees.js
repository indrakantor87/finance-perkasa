/* eslint-disable no-console */
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('[CLEANUP] Mulai membersihkan data karyawan developer...');

  // Kandidat employee yang dibuat untuk pengembangan
  const candidateIds = ['dev-employee-01', 'dev-employee-02'];
  const candidateNames = ['Developer Lokal', 'Developer Admin', 'Developer', 'Developer Lokal', 'Developer Admin'];

  const employees = await prisma.employee.findMany({
    where: {
      OR: [
        { id: { in: candidateIds } },
        { name: { in: candidateNames } },
      ],
    },
    select: { id: true, name: true },
  });

  if (employees.length === 0) {
    console.log('[CLEANUP] Tidak ada karyawan developer yang ditemukan. Selesai.');
    return;
  }

  // Putuskan relasi di User.employeeId sebelum hapus Employee
  const ids = employees.map((e) => e.id);
  await prisma.user.updateMany({
    where: { employeeId: { in: ids } },
    data: { employeeId: null },
  });

  // Hapus employees kandidat
  const result = await prisma.employee.deleteMany({
    where: { id: { in: ids } },
  });

  console.log(`[CLEANUP] Dihapus: ${result.count} karyawan`);
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

