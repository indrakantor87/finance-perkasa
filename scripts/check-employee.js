const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkEmployee() {
  try {
    console.log('Searching for employee "Sheva"...');
    const employee = await prisma.employee.findFirst({
      where: {
        name: {
          contains: 'Sheva',
        }
      }
    });

    if (employee) {
      console.log('Found employee in DB:', employee);
    } else {
      console.log('Employee "Sheva" NOT found in DB.');
    }
  } catch (error) {
    console.error('Error checking employee:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkEmployee();
