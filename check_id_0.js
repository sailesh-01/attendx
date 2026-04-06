const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function checkId0() {
    const { data, error } = await supabase
        .from('students')
        .select('id, name')
        .eq('id', 0);

    if (error) {
        console.error('Error fetching students:', error.message);
    } else {
        console.log(`Found ${data.length} students with id 0.`);
        console.log('Data:', JSON.stringify(data, null, 2));
    }
}

checkId0();
