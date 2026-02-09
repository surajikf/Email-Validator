import dotenv from 'dotenv';
import path from 'path';

// Load env from project root/backend
// Adjust path: src/scripts -> backend/.env is ../../.env
const envPath = path.resolve(__dirname, '../../.env');
console.log(`Loading .env from: ${envPath}`);
dotenv.config({ path: envPath });

async function main() {
    // Dynamic import ensures env vars are loaded first
    const { SendingQueue } = await import('../queue/sendingQueue');

    console.log('Manually triggering SendingQueue...');
    try {
        await SendingQueue.processDailyCampaign();
        console.log('Done');
    } catch (err) {
        console.error(err);
    }
}

main();
