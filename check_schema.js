const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function checkStudents() {
    const { data, error } = await supabase
        .from('students')
        .select('*')
        .limit(1);

    if (error) {
        console.error('Error fetching students:', error.message);
    } else {
        console.log('Sample student:', JSON.stringify(data[0], null, 2));
    }
}

checkStudents();
