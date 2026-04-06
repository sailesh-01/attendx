# Direct WhatsApp Cloud API Integration Plan

A streamlined, zero-cost integration that connects your AttendX backend directly to Meta's Official WhatsApp API.

## 🛠️ Phase 1: Meta Portal Prep (Your Part)

While I'm setting up the code, you need to create your **Message Template** in the Meta Portal:

1.  Go to the [WhatsApp Manager](https://business.facebook.com/wa/manage/templates/).
2.  Click **Create Template**.
3.  **Category**: Utility.
4.  **Name**: `student_absent_alert`.
5.  **Language**: English (US).
6.  **Body**: Enter your message. Use `{{1}}` for variables.
    - Example: `Dear Parent, your ward {{1}} ({{2}}) was marked ABSENT on {{3}}. From: {{4}} Department.`
7.  **Submit**: Wait for Meta to approve (usually instant).

---

## 🚀 Phase 2: Backend Implementation (My Part)

### 1. Secure Credential Management

#### [MODIFY] [.env](file:///d:/program/CLGP/Attendance/.env) [NEW]
- Add placeholders for `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_ID`, and `WHATSAPP_TEMPLATE_NAME`.

### 2. Automation Engine

#### [MODIFY] [server.js](file:///d:/program/CLGP/Attendance/server.js)
- Implement `triggerWhatsAppAlerts(absentees)` function.
- This function will loop through only the "Absent" students and call the Meta API using the template.
- Integration point: Inside `app.post('/api/attendance')`.

### 3. Frontend Refinement

#### [MODIFY] [whatsapp.html](file:///d:/program/CLGP/Attendance/whatsapp.html) & [whatsapp.js](file:///d:/program/CLGP/Attendance/whatsapp.js)
- Simplify the "Automation" tab.
- Add a "Test Connection" button that calls a new `/api/test-whatsapp` endpoint to verify credentials.

---

## 📅 Verification Plan

### Automated Tests
- Log the API response in the server console to ensure "200 OK" from Meta.

### Manual Verification
- Enter an "Absent" record.
- Verify the test phone number receives the official template message.
