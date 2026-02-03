import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

console.log('Testing Supabase Init...');
console.log('URL:', supabaseUrl);
console.log('Key:', supabaseServiceRoleKey.substring(0, 10) + '...');

try {
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
    console.log('Supabase client created successfully.');
} catch (error) {
    console.error('Supabase Init Failed:', error);
}
