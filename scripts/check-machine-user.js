const ZKLib = require('zkteco-js');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const test = async () => {
  let zkInstance;
  try {
    const settings = await prisma.systemSetting.findFirst();
    const ip = settings?.machineIp || '103.162.16.14';
    const port = settings?.machinePort || 4370;

    zkInstance = new ZKLib(ip, port, 20000, 4000);
    console.log(`Connecting to machine at ${ip}:${port}...`);
    
    await zkInstance.createSocket();
    console.log('Socket created');
    
    console.log('Getting users...');
    const users = await zkInstance.getUsers();
    console.log(`Total users in machine: ${users.data.length}`);
    
    const sheva = users.data.find(u => u.name && u.name.toLowerCase().includes('sheva'));
    
    if (sheva) {
      console.log('Found user in machine:', sheva);
    } else {
      console.log('User "Sheva" NOT found in machine.');
    }
    
    console.log('Disconnecting...');
    await zkInstance.disconnect();
  } catch (e) {
    console.log('Error:', e);
    if (zkInstance) {
      try {
        await zkInstance.disconnect();
      } catch (err) {
        // ignore
      }
    }
  }
}

test();
