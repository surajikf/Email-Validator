import { supabase } from '../lib/supabase';
import dotenv from 'dotenv';
import path from 'path';

// Load env
const envPath = path.resolve(__dirname, '../../.env');
console.log(`Loading .env from: ${envPath}`);
dotenv.config({ path: envPath });

async function verifyStats() {
    // Dynamic import to ensure env vars are loaded
    const { supabase } = await import('../lib/supabase');

    if (!supabase) {
        console.error('Supabase client not initialized');
        return;
    }

    console.log('--- Verifying Database Stats ---');

    const { count: total, error: errTotal } = await supabase
        .from('validated_emails')
        .select('*', { count: 'exact', head: true });

    const { count: valid, error: errValid } = await supabase
        .from('validated_emails')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'valid');

    const { count: invalid, error: errInvalid } = await supabase
        .from('validated_emails')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'invalid');

    const { count: risky, error: errRisky } = await supabase
        .from('validated_emails')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'risky');

    const { count: sent, error: errSent } = await supabase
        .from('validated_emails')
        .select('*', { count: 'exact', head: true })
        .not('sent_at', 'is', null);

    if (errTotal || errValid || errSent) {
        console.error('Error fetching stats:', errTotal || errValid || errSent);
        return;
    }

    console.log(`Total Emails (Validated): ${total}`);
    console.log(`Status 'valid': ${valid}`);
    console.log(`Status 'invalid': ${invalid}`);
    console.log(`Status 'risky': ${risky}`);
    console.log(`Sent Emails (sent_at IS NOT NULL): ${sent}`);
    console.log('--------------------------------');
}

verifyStats();
