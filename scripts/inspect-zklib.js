const ZKLib = require('node-zklib')

async function main() {
    try {
        const zk = new ZKLib('103.162.16.14', 4370, 5000, 4000)
        console.log('Available methods on ZK instance:')
        
        // Inspect prototype
        const proto = Object.getPrototypeOf(zk)
        console.log(Object.getOwnPropertyNames(proto))

        // Also check if there are any specific methods for data management
        console.log('---')
        
    } catch (e) {
        console.error(e)
    }
}

main()
