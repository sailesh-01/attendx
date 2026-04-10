const express = require('express');
const cors = require('cors');
const path = require('path');
const ExcelJS = require('exceljs');
const fs = require('fs');
const bcrypt = require('bcryptjs');
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const app = express();
const port = process.env.PORT || 3000;

// System Status Management
let systemStatus = 'Live';
const statusFile = path.join(__dirname, 'status.json');

function loadStatus() {
    if (fs.existsSync(statusFile)) {
        try {
            const data = JSON.parse(fs.readFileSync(statusFile));
            systemStatus = data.status || 'Live';
        } catch (e) {
            console.error("Error loading status:", e);
        }
    }
}

function saveStatus() {
    fs.writeFileSync(statusFile, JSON.stringify({ status: systemStatus }));
}

loadStatus();

// Initialize Supabase Client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname)); // Serve frontend files

// Request Logging
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
});

console.log('Using Supabase for database operations.');

// Note: Database initialization (CREATE TABLE) should be done via Supabase Dashboard SQL Editor
// seeding is handled manually or skipped if already done in SQL Editor.

// API Endpoints

// Students
app.get('/api/students', async (req, res) => {
    const { year, section } = req.query;
    let query = supabase.from('students').select('*');
    
    if (year) query = query.eq('year', parseInt(year));
    if (section) query = query.eq('section', section);
    
    const { data, error } = await query;
    if (error) return res.status(500).json({ error: error.message });
    console.log(`Fetched ${data.length} students from Supabase`);
    res.json(data);
});

app.post('/api/students', async (req, res) => {
    const { sno, short_code, roll_no, name, phone, parent_phone, parent_name, year, section, dept, custom_data } = req.body;
    const { data, error } = await supabase.from('students').insert([
        { sno, short_code, roll_no, name, phone, parent_phone, parent_name, year, section: section || 'A', dept, custom_data: custom_data || {} }
    ]).select();
    
    if (error) return res.status(500).json({ error: error.message });
    res.json({ id: data[0].id });
});

app.put('/api/students/:id', async (req, res) => {
    const { sno, short_code, roll_no, name, phone, parent_phone, parent_name, year, section, dept, custom_data } = req.body;
    const { error } = await supabase.from('students').update({
        sno, short_code, roll_no, name, phone, parent_phone, parent_name, year, section: section || 'A', dept, custom_data: custom_data || {}
    }).eq('id', req.params.id);
    
    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
});

app.delete('/api/students/:id', async (req, res) => {
    const { error } = await supabase.from('students').delete().eq('id', req.params.id);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
});

app.delete('/api/students', async (req, res) => {
    const { error } = await supabase.from('students').delete().neq('id', 0); // Delete all
    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
});

// Attendance
app.get('/api/attendance/summary', async (req, res) => {
    const { year, section } = req.query;
    const { data, error } = await supabase
        .from('attendance')
        .select(`
            student_id, date, status,
            students!inner (short_code, year, section)
        `)
        .eq('students.year', parseInt(year))
        .eq('students.section', section || 'A')
        .order('date', { ascending: false });

    if (error) return res.status(500).json({ error: error.message });
    
    // Flatten result to match previous SQLite output structure
    const flattened = data.map(r => ({
        student_id: r.student_id,
        date: r.date,
        status: r.status,
        short_code: r.students.short_code
    }));
    res.json(flattened);
});

app.get('/api/attendance', async (req, res) => {
    const { date, year, section } = req.query;
    const { data, error } = await supabase
        .from('attendance')
        .select(`
            *,
            students!inner (short_code, name, roll_no, year, section)
        `)
        .eq('date', date)
        .eq('students.year', parseInt(year))
        .eq('students.section', section || 'A');

    if (error) return res.status(500).json({ error: error.message });
    
    const flattened = data.map(r => ({
        ...r,
        short_code: r.students.short_code,
        name: r.students.name,
        roll_no: r.students.roll_no
    }));
    res.json(flattened);
});

app.post('/api/attendance', async (req, res) => {
    const { date, records } = req.body;
    
    // UPSERT records
    const upsertData = records.map(r => ({
        student_id: r.student_id,
        date: date,
        status: r.status
    }));

    const { error } = await supabase
        .from('attendance')
        .upsert(upsertData, { onConflict: 'student_id,date' });

    if (error) return res.status(500).json({ error: error.message });
    
    // Background Excel Sync
    exportAttendanceToExcel()
        .then(() => console.log("Excel sync success"))
        .catch(e => console.error("Excel sync fail", e));

    // Dynamic n8n WhatsApp Trigger
    const { username } = req.body;
    if (username) {
        const { data: user } = await supabase
            .from('users')
            .select('whatsapp_token, whatsapp_phone_id, whatsapp_template_name')
            .eq('username', username)
            .single();

        if (user && user.whatsapp_token && user.whatsapp_phone_id) {
            const n8nUrl = "https://mixip-n8n.hf.space/webhook-test/attendance-alert";
            const absentees = records.filter(r => r.status === 'A' || r.status === 'OD');
            
            if (absentees.length > 0) {
                // Fetch student names for n8n payload
                const { data: studentDetails } = await supabase
                    .from('students')
                    .select('id, name, roll_no, parent_phone, dept')
                    .in('id', absentees.map(a => a.student_id));

                const richRecords = absentees.map(a => {
                    const s = studentDetails?.find(st => st.id === a.student_id) || {};
                    return { ...a, ...s };
                });

                fetch(n8nUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        staff_username: username,
                        whatsapp_config: {
                            token: user.whatsapp_token,
                            phone_id: user.whatsapp_phone_id,
                            template: user.whatsapp_template_name
                        },
                        date: date,
                        records: richRecords
                    })
                }).then(() => console.log(`n8n triggered for ${username}`))
                  .catch(e => console.error("n8n trigger failed", e));
            }
        }
    }

    res.json({ success: true });
});

app.put('/api/attendance/mark-sent', async (req, res) => {
    const { student_id, date } = req.body;
    const { error } = await supabase
        .from('attendance')
        .update({ whatsapp_sent_at: new Date().toISOString() })
        .eq('student_id', student_id)
        .eq('date', date);
        
    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
});

// Marks
app.get('/api/marks', async (req, res) => {
    const { year, section, exam_type } = req.query;
    const { data, error } = await supabase
        .from('marks')
        .select(`
            *,
            students!inner (short_code, name, roll_no, year, section)
        `)
        .eq('exam_type', exam_type)
        .eq('students.year', parseInt(year))
        .eq('students.section', section || 'A');

    if (error) return res.status(500).json({ error: error.message });
    
    const flattened = data.map(r => ({
        ...r,
        short_code: r.students.short_code,
        name: r.students.name,
        roll_no: r.students.roll_no
    }));
    res.json(flattened);
});

app.post('/api/marks', async (req, res) => {
    const records = req.body;
    const { error } = await supabase.from('marks').upsert(records);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
});

// Auth
const ADMIN_HASH = '$2b$10$HI7jEuMrAuswWmmB6MVIqu7Rr6UO9XPaDtnL6oK4yJu23CQZ9abWS';

app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    
    // Check system status FIRST for non-admin users
    if (username !== 'ADMIN' && systemStatus !== 'Live') {
        return res.status(503).json({ 
            error: systemStatus === 'Maintenance' 
                ? "on maintenance please login after some time" 
                : "server is in stop",
            system_status: systemStatus
        });
    }
    
    if (username === 'ADMIN') {
        if (bcrypt.compareSync(password, ADMIN_HASH)) {
            return res.json({ 
                username: 'ADMIN', 
                assign_year: 1, 
                assign_section: 'A' 
            });
        }
    }

    const { data: user, error } = await supabase
        .from('users')
        .select('*')
        .eq('username', username)
        .single();

    if (error || !user || !bcrypt.compareSync(password, user.password)) {
        return res.status(401).json({ error: "Invalid username or password" });
    }
    
    const { id, password: _, ...userData } = user;
    res.json(userData);
});

app.post('/api/change-password', async (req, res) => {
    const { username, oldPassword, newPassword } = req.body;
    
    const { data: user, error: fetchErr } = await supabase
        .from('users')
        .select('*')
        .eq('username', username)
        .single();

    if (fetchErr || !user || !bcrypt.compareSync(oldPassword, user.password)) {
        return res.status(401).json({ error: "Incorrect old password" });
    }
    
    const hashedNew = bcrypt.hashSync(newPassword, 10);
    const { error: updateErr } = await supabase
        .from('users')
        .update({ password: hashedNew })
        .eq('id', user.id);

    if (updateErr) return res.status(500).json({ error: updateErr.message });
    res.json({ success: true, message: "Password updated successfully" });
});

app.post('/api/register', async (req, res) => {
    const { username, password, year, section } = req.body;
    
    const hashedPassword = bcrypt.hashSync(password, 10);
    const { data, error } = await supabase
        .from('users')
        .insert([{ 
            username, 
            password: hashedPassword, 
            assign_year: year, 
            assign_section: section,
            whatsapp_token,
            whatsapp_phone_id,
            whatsapp_template_name
        }])
        .select();

    if (error) return res.status(500).json({ error: error.message });
    res.status(201).json({ success: true, id: data[0].id });
});

// Admin Staff Management Middleware
const isAdmin = (req, res, next) => {
    const adminUser = req.body?.adminUser || req.query?.adminUser || req.headers['x-admin-user'];
    if (adminUser === 'ADMIN') {
        next();
    } else {
        res.status(403).json({ error: "Access denied. Admin only." });
    }
};

app.get('/api/admin/staff', isAdmin, async (req, res) => {
    // Note: In production, add a proper session/token check here.
    const { data: users, error } = await supabase
        .from('users')
        .select('id, username, assign_year, assign_section, email, whatsapp_token, whatsapp_phone_id, whatsapp_template_name');

    if (error) return res.status(500).json({ error: error.message });
    res.json(users);
});

app.post('/api/admin/staff', isAdmin, async (req, res) => {
    const { username, password, year, section, email, whatsapp_token, whatsapp_phone_id, whatsapp_template_name } = req.body;
    
    // Check if username already exists
    const { data: existing } = await supabase.from('users').select('id').eq('username', username).single();
    if (existing) return res.status(400).json({ error: "Username already exists" });

    const hashedPassword = bcrypt.hashSync(password, 10);
    const { data, error } = await supabase
        .from('users')
        .insert([{ 
            username, 
            password: hashedPassword, 
            assign_year: year, 
            assign_section: section,
            email,
            whatsapp_token,
            whatsapp_phone_id,
            whatsapp_template_name
        }])
        .select();

    if (error) return res.status(500).json({ error: error.message });
    res.status(201).json({ success: true, id: data[0].id });
});

app.put('/api/admin/staff/:id', isAdmin, async (req, res) => {
    const { username, password, year, section, email, whatsapp_token, whatsapp_phone_id, whatsapp_template_name } = req.body;
    const updateData = { 
        username, 
        assign_year: year, 
        assign_section: section,
        email,
        whatsapp_token,
        whatsapp_phone_id,
        whatsapp_template_name
    };
    
    if (password) {
        updateData.password = bcrypt.hashSync(password, 10);
    }

    const { error } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', req.params.id);

    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
});

app.delete('/api/admin/staff/:id', isAdmin, async (req, res) => {
    const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', req.params.id);

    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
});

// System Status API
app.get('/api/system-status', (req, res) => {
    res.json({ status: systemStatus });
});

app.post('/api/system-status', isAdmin, (req, res) => {
    const { status } = req.body;
    if (['Live', 'Maintenance', 'Stop'].includes(status)) {
        systemStatus = status;
        saveStatus();
        console.log(`System status changed to: ${status}`);
        res.json({ success: true, status: systemStatus });
    } else {
        res.status(400).json({ error: "Invalid status" });
    }
});

// WhatsApp API Status
app.get('/api/whatsapp-config', (req, res) => {
    res.json({
        hasToken: !!process.env.WHATSAPP_TOKEN,
        hasPhoneId: !!process.env.WHATSAPP_PHONE_ID,
        templateName: process.env.WHATSAPP_TEMPLATE_NAME || 'None'
    });
});

app.post('/api/test-whatsapp', async (req, res) => {
    try {
        await triggerWhatsAppAlerts([{ student_id: 'test', status: 'A' }], new Date().toISOString().split('T')[0]);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Weekly Cleanup Routine
async function clearOldAttendance() {
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 is Sunday
    
    if (dayOfWeek === 0) {
        const { error } = await supabase.from('attendance').delete().neq('id', 0);
        if (!error) console.log("Sunday Cleanup: Cleared all attendance records.");
    } else {
        const diff = today.getDate() - dayOfWeek + 1;
        const thisMonday = new Date(today.setDate(diff));
        const isoMonday = thisMonday.toISOString().split('T')[0];
        
        const { count, error } = await supabase
            .from('attendance')
            .delete()
            .lt('date', isoMonday);
            
        if (!error) {
            console.log(`Weekly Cleanup completed.`);
        }
    }
}

// Run cleanup and initial Excel export on server startup, and then verify every 6 hours
clearOldAttendance();
exportAttendanceToExcel().catch(e => console.error("Initial Excel export failed", e));
setInterval(clearOldAttendance, 6 * 60 * 60 * 1000);

// Excel Sync Function (Enhanced with Supabase)
async function exportAttendanceToExcel() {
    const { data: rows, error } = await supabase
        .from('attendance')
        .select(`
            date,
            status,
            students (
                year, section, short_code, roll_no, name, phone, parent_name, parent_phone, dept
            )
        `)
        .order('date', { ascending: false });

    if (error) {
        console.error("Fetch for Excel failed:", error.message);
        return;
    }

    try {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Attendance Report');
        
        worksheet.columns = [
            { header: 'Date', key: 'Date', width: 12 },
            { header: 'Year', key: 'Year', width: 8 },
            { header: 'Section', key: 'Section', width: 8 },
            { header: 'Short Code', key: 'Short Code', width: 12 },
            { header: 'Roll No', key: 'Roll No', width: 15 },
            { header: 'Student Name', key: 'Student Name', width: 25 },
            { header: 'Phone', key: 'Phone', width: 15 },
            { header: 'Parent', key: 'Parent', width: 20 },
            { header: 'Parent Phone', key: 'Parent Phone', width: 15 },
            { header: 'Dept', key: 'Dept', width: 8 },
            { header: 'Status', key: 'Status', width: 10 }
        ];

        worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
        worksheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F81BD' } };
        worksheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };

        rows.forEach(row => {
            const student = row.students || {};
            const excelRow = {
                'Date': row.date,
                'Year': student.year,
                'Section': student.section,
                'Short Code': student.short_code,
                'Roll No': student.roll_no,
                'Student Name': student.name,
                'Phone': student.phone,
                'Parent': student.parent_name,
                'Parent Phone': student.parent_phone,
                'Dept': student.dept,
                'Status': row.status
            };
            
            const r = worksheet.addRow(excelRow);
            const statusCell = r.getCell('Status');
            const status = row.status;

            if (status === 'P') {
                statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFC6EFCE' } };
                statusCell.font = { color: { argb: 'FF006100' } };
            } else if (status === 'A') {
                statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFC7CE' } };
                statusCell.font = { color: { argb: 'FF9C0006' } };
            } else if (status === 'OD') {
                statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFEB9C' } };
                statusCell.font = { color: { argb: 'FF9C6500' } };
            }
            statusCell.alignment = { horizontal: 'center' };
        });

        worksheet.autoFilter = 'A1:K1';
        const filePath = path.join(__dirname, 'attendance_report.xlsx');
        await workbook.xlsx.writeFile(filePath);
        console.log(`Excel Sync: Updated ${rows.length} records`);
    } catch (e) {
        console.error("Excel export failed:", e);
    }
}

// WhatsApp Automation Service
async function triggerWhatsAppAlerts(records, date) {
    const token = process.env.WHATSAPP_TOKEN;
    const phoneId = process.env.WHATSAPP_PHONE_ID;
    const templateName = process.env.WHATSAPP_TEMPLATE_NAME;

    if (!token || !phoneId || !templateName) {
        console.warn("WhatsApp credentials missing. Skipping automation.");
        return;
    }

    const absentees = records.filter(r => r.status === 'A' || r.status === 'OD');
    if (absentees.length === 0) return;

    console.log(`Triggering WhatsApp for ${absentees.length} students...`);

    for (const record of absentees) {
        try {
            // Fetch student details from Supabase
            const { data: student, error } = await supabase
                .from('students')
                .select('name, roll_no, parent_phone, dept')
                .eq('id', record.student_id)
                .single();

            if (error || !student || !student.parent_phone) continue;

            const url = `https://graph.facebook.com/v21.0/${phoneId}/messages`;
            const payload = {
                messaging_product: "whatsapp",
                to: student.parent_phone,
                type: "template",
                template: {
                    name: templateName,
                    language: { code: "en_US" },
                    components: [
                        {
                            type: "body",
                            parameters: [
                                { type: "text", text: student.name },
                                { type: "text", text: student.roll_no },
                                { type: "text", text: date },
                                { type: "text", text: student.dept || 'College' }
                            ]
                        }
                    ]
                }
            };

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            const result = await response.json();
            if (response.ok) {
                // Mark as sent in Supabase
                await supabase
                    .from('attendance')
                    .update({ whatsapp_sent_at: new Date().toISOString() })
                    .eq('student_id', record.student_id)
                    .eq('date', date);
                
                console.log(`Alert sent to ${student.name} (${student.parent_phone})`);
            } else {
                console.error(`Meta API Error for ${student.name}:`, result.error?.message || result);
            }
        } catch (e) {
            console.error(`Failed to send alert for student ID ${record.student_id}:`, e);
        }
    }
}

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});

module.exports = app;
