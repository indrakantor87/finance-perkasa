const ZKLib = require('zkteco-js');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Usage: node scripts/set-machine-admin.js "Nama User" [role_number]
// Default role is 14 (Super Admin) if not specified
// Role 0 = User Biasa

const targetName = process.argv[2];
const targetRole = process.argv[3] ? parseInt(process.argv[3]) : 14;

if (!targetName) {
    console.error('Please provide a user name. Example: node scripts/set-machine-admin.js "Indra"');
    process.exit(1);
}

const main = async () => {
  let zkInstance;
  try {
    const settings = await prisma.systemSetting.findFirst();
    const ip = settings?.machineIp || '103.162.16.14';
    const port = settings?.machinePort || 4370;

    zkInstance = new ZKLib(ip, port, 20000, 4000);
    console.log(`Connecting to machine at ${ip}:${port}...`);
    await zkInstance.createSocket();
    console.log('Connected.');

    console.log('Fetching users...');
    const users = await zkInstance.getUsers();
    
    const user = users.data.find(u => u.name.toLowerCase() === targetName.toLowerCase());
    
    if (!user) {
        console.error(`User "${targetName}" not found!`);
        await zkInstance.disconnect();
        return;
    }

    console.log(`Found user: ${user.name} (UID: ${user.uid}, UserID: ${user.userId}, Current Role: ${user.role})`);
    console.log(`Updating role to ${targetRole} (Admin)...`);

    // setUser(uid, userid, name, password, role, cardno)
    await zkInstance.setUser(user.uid, user.userId, user.name, user.password, targetRole, user.cardno);
    
    console.log('User updated successfully.');
    
    // Verify
    const updatedUsers = await zkInstance.getUsers();
    const updatedUser = updatedUsers.data.find(u => u.uid === user.uid);
    console.log(`Verification - New Role: ${updatedUser.role}`);

  } catch (e) {
    console.error('Error:', e);
  } finally {
    if (zkInstance) {
      try {
        await zkInstance.disconnect();
      } catch (e) {}
    }
  }
};

main();
