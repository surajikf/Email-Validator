import { supabase } from './lib/supabase';

async function verifySupabase() {
    console.log('--- Supabase Persistence Verification ---');
    try {
        const { count, error } = await supabase
            .from('validated_emails')
            .select('*', { count: 'exact', head: true });

        if (error) {
            console.error('❌ Error connecting to Supabase table:', error.message);
            console.log('Possible reason: Table might not exist or Service Role Key is invalid.');
            return;
        }

        console.log(`✅ Connection Successful!`);
        console.log(`📊 Current record count in 'validated_emails': ${count}`);

        if (count && count > 0) {
            console.log('\n--- Recent Records ---');
            const { data: recent } = await supabase
                .from('validated_emails')
                .select('email, status, validated_at')
                .order('validated_at', { ascending: false })
                .limit(5);

            console.table(recent);
        } else {
            console.log('\nℹ️ Table is empty. Try validating some emails in the app.');
        }

    } catch (err) {
        console.error('❌ Unexpected Error:', err);
    }
}

verifySupabase();
