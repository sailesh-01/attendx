const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function checkMaxId() {
    const { data, error } = await supabase
        .from('students')
        .select('id')
        .order('id', { ascending: false })
        .limit(1);

    if (error) {
        console.error('Error fetching students:', error.message);
    } else {
        console.log('Max id:', data[0] ? data[0].id : 'None');
    }
}

checkMaxId();
