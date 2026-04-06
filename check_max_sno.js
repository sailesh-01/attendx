const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function checkMaxSno() {
    const { data, error } = await supabase
        .from('students')
        .select('sno')
        .order('sno', { ascending: false })
        .limit(1);

    if (error) {
        console.error('Error fetching students:', error.message);
    } else {
        console.log('Max sno:', data[0] ? data[0].sno : 'None');
    }
}

checkMaxSno();
