const ZKLib = require('zkteco-js');

const main = async () => {
  let zkInstance;
  try {
    zkInstance = new ZKLib('103.162.16.14', 4370, 20000, 4000);
    console.log('Connecting to machine...');
    await zkInstance.createSocket();
    console.log('Connected.');

    console.log('Fetching users...');
    const users = await zkInstance.getUsers();
    
    console.log('\n--- Machine Users ---');
    console.log('UID | UserID | Name | Role');
    console.log('---------------------------');
    
    if (users && users.data) {
        users.data.sort((a, b) => parseInt(a.userId) - parseInt(b.userId));
        users.data.forEach(u => {
            // Role 14 is usually Super Admin, 0 is User
            const roleName = u.role === 14 ? 'ADMIN (14)' : `User (${u.role})`;
            console.log(`${String(u.uid).padEnd(3)} | ${String(u.userId).padEnd(6)} | ${String(u.name).padEnd(20)} | ${roleName}`);
        });
    }

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
