const { createClient } = require('@supabase/supabase-js');
const XLSX = require('xlsx');
const path = require('path');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

const csvFile = path.join(__dirname, 'Book1.csv');

async function uploadData() {
    try {
        console.log(`Reading CSV file: ${csvFile}`);
        const workbook = XLSX.readFile(csvFile);
        const sheetName = workbook.SheetNames[0];
        const data = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

        console.log(`Parsed ${data.length} records. Preparing students for Year 2, Section A...`);

        let nextSno = 190; // Start high to avoid conflicts
        let nextId = 10;   // Manual ID to bypass out-of-sync sequence
        const studentsToUpload = data.map(record => {
            const rollNo = (record['Roll Number'] || '').trim();
            const name = (record['Student Name'] || '').trim();
            
            if (!name) return null;

            // Extract numeric short code (last 3 digits of roll number)
            const shortCodeMatch = rollNo.match(/\d{3}$/);
            let shortCode = shortCodeMatch ? shortCodeMatch[0] : '';
            let sno = shortCode ? parseInt(shortCode) : nextSno++; 
            
            if (!shortCode) shortCode = sno.toString();

            return {
                id: nextId++,
                sno: sno,
                short_code: shortCode,
                roll_no: rollNo || `TEMP_${sno}`,
                name: name,
                year: 2,
                section: 'A',
                dept: 'AD',
                phone: '',
                parent_phone: '',
                parent_name: '',
                custom_data: {}
            };
        }).filter(s => s !== null); 

        console.log(`Uploading ${studentsToUpload.length} students to Supabase...`);

        const { data: insertedData, error } = await supabase
            .from('students')
            .insert(studentsToUpload);

        if (error) {
            throw error;
        }

        console.log(`Successfully uploaded ${studentsToUpload.length} students.`);
    } catch (error) {
        console.error('Error during upload:', error.message);
        process.exit(1);
    }
}

uploadData();
