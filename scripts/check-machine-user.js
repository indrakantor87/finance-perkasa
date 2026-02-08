const ZKLib = require('zkteco-js');

const test = async () => {
  let zkInstance;
  try {
    zkInstance = new ZKLib('103.162.16.14', 4370, 20000, 4000);
    console.log('Connecting to machine...');
    
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
