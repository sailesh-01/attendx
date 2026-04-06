const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function checkUser() {
    const { data: user, error } = await supabase
        .from('users')
        .select('*')
        .eq('username', 'ts101')
        .single();

    if (error) {
        console.error('Error fetching user:', error.message);
        process.exit(1);
    }

    console.log('User found:', JSON.stringify(user, null, 2));
}

checkUser();
