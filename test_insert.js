const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function checkTableInfo() {
    const { data, error } = await supabase.rpc('get_table_info', { table_name: 'students' });
    // Note: get_table_info might not exist, so I'll try a direct SQL query via a known RPC or just fetch a row with all columns
    if (error) {
        // Fallback: search for unique constraints in common ways or just try one insert
        console.error('Error fetching table info:', error.message);
        
        // Try inserting one record with a high SNO
        const { data: ins, error: insErr } = await supabase.from('students').insert([{
            sno: 999,
            short_code: '999',
            roll_no: 'TEST_999',
            name: 'Test Student',
            year: 2,
            section: 'A',
            dept: 'AD'
        }]).select();
        
        if (insErr) {
            console.error('Insert test failed:', insErr.message);
        } else {
            console.log('Insert test success:', JSON.stringify(ins, null, 2));
            // Delete it afterwards
            await supabase.from('students').delete().eq('sno', 999);
        }
    } else {
        console.log('Table info:', JSON.stringify(data, null, 2));
    }
}

checkTableInfo();
