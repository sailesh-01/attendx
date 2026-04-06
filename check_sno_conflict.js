const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function checkSno() {
    const { data, error } = await supabase
        .from('students')
        .select('sno, name, year, section')
        .eq('sno', 124);

    if (error) {
        console.error('Error fetching students:', error.message);
    } else {
        console.log(`Found ${data.length} students with sno 124.`);
        console.log('Data:', JSON.stringify(data, null, 2));
    }
}

checkSno();
