const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function checkIds() {
    const { data, error } = await supabase
        .from('students')
        .select('id, sno, name, roll_no')
        .limit(10);

    if (error) {
        console.error('Error fetching students:', error.message);
    } else {
        console.log('Students List:', JSON.stringify(data, null, 2));
    }
}

checkIds();
