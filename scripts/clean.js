
const fs = require('fs');
const path = require('path');

const pathsToDelete = [
    path.join(__dirname, '../.next/cache'), // Next.js cache
    path.join(__dirname, '../.next/dev/logs'), // Next.js logs
    path.join(__dirname, '../.next_old'), // Old build backups
    path.join(__dirname, '../npm-debug.log'),
    path.join(__dirname, '../yarn-error.log'),
    path.join(__dirname, '../database_dump.json'), // Redundant dump if exists
];

console.log('Starting cleanup...');

pathsToDelete.forEach(p => {
    try {
        if (fs.existsSync(p)) {
            fs.rmSync(p, { recursive: true, force: true });
            console.log(`✅ Deleted: ${p}`);
        } else {
            // console.log(`Skipped (not found): ${p}`);
        }
    } catch (e) {
        console.error(`❌ Failed to delete ${p}:`, e.message);
    }
});

console.log('Cleanup complete.');
