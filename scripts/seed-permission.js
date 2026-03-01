/* eslint-disable no-console */
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('[SEED] Mencoba menambahkan 1 data perizinan untuk karyawan Indra (bulan ini)');

  const user = await prisma.user.findUnique({ where: { email: 'indra@perkasa.net.id' } });
  if (!user) {
    console.log('[SEED] User indra@perkasa.net.id tidak ditemukan.');
    return;
  }

  let employeeId = user.employeeId;
  if (!employeeId && user.name) {
    const emp = await prisma.employee.findFirst({ where: { name: user.name } });
    if (emp) employeeId = emp.id;
  }
  if (!employeeId) {
    console.log('[SEED] employeeId untuk user Indra tidak ditemukan.');
    return;
  }

  const now = new Date();
  const startDate = new Date(now.getFullYear(), now.getMonth(), Math.max(1, now.getDate() - 1));
  const endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const request = await prisma.leaveRequest.create({
    data: {
      employeeId,
      type: 'SICK',
      startDate,
      endDate,
      duration: 2,
      durationUnit: 'DAYS',
      reason: 'Sakit flu ringan',
      status: 'PENDING',
    },
  });

  console.log('[SEED] Perizinan dibuat:', { id: request.id, employeeId: request.employeeId, startDate, endDate });
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

