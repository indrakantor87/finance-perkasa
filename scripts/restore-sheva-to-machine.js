const ZKLib = require('zkteco-js');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const main = async () => {
  let zkInstance;
  try {
    const settings = await prisma.systemSetting.findFirst();
    const ip = settings?.machineIp || '103.162.16.14';
    const port = settings?.machinePort || 4370;

    // Connect to machine
    zkInstance = new ZKLib(ip, port, 20000, 4000);
    console.log(`Connecting to machine at ${ip}:${port}...`);
    await zkInstance.createSocket();
    console.log('Connected.');

    // Get existing users
    console.log('Fetching users...');
    const users = await zkInstance.getUsers();
    const userList = users.data || [];
    console.log(`Found ${userList.length} users.`);

    // Check if Sheva already exists (double check)
    const existingSheva = userList.find(u => u.name && u.name.toLowerCase() === 'sheva');
    if (existingSheva) {
      console.log('User Sheva already exists:', existingSheva);
      return;
    }

    // Find next available UID and UserID
    let maxUid = 0;
    let maxUserId = 0;

    userList.forEach(u => {
      if (u.uid > maxUid) maxUid = u.uid;
      const uidNum = parseInt(u.userId);
      if (!isNaN(uidNum) && uidNum > maxUserId) maxUserId = uidNum;
    });

    const newUid = maxUid + 1;
    const newUserId = (maxUserId + 1).toString();

    console.log(`Creating user 'Sheva' with uid=${newUid}, userId=${newUserId}...`);

    // setUser(uid, userid, name, password, role, cardno)
    // role: 0 = User
    await zkInstance.setUser(newUid, newUserId, 'Sheva', '', 0, 0);
    console.log('User created successfully.');

    // Verify
    const updatedUsers = await zkInstance.getUsers();
    const sheva = updatedUsers.data.find(u => u.name === 'Sheva');
    if (sheva) {
      console.log('Verification successful:', sheva);
    } else {
      console.error('Verification failed: User not found after creation.');
    }

  } catch (e) {
    console.error('Error:', e);
  } finally {
    if (zkInstance) {
      try {
        await zkInstance.disconnect();
        console.log('Disconnected.');
      } catch (e) {
        // ignore
      }
    }
  }
};

main();
