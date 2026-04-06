const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function checkStudents() {
    const { data, error } = await supabase
        .from('students')
        .select('sno, name, roll_no')
        .eq('year', 2)
        .eq('section', 'A');

    if (error) {
        console.error('Error fetching students:', error.message);
    } else {
        console.log(`Found ${data.length} students for Year 2, Section A.`);
        console.log('Sample data:', JSON.stringify(data.slice(0, 5), null, 2));
    }
}

checkStudents();
