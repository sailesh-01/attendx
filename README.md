# attendx
A modern, high-performance web application designed for academic institutions to manage student attendance, track marks, and generate administrative reports. Now fully integrated with **Supabase** for real-time, cloud-based data persistence.
# 📊 Student Attendance & Marks Management Portal (Cloud Powered)

A modern, high-performance web application designed for academic institutions to manage student attendance, track marks, and generate administrative reports. Now fully integrated with **Supabase** for real-time, cloud-based data persistence.

## 🚀 Key Features

- **Cloud Synchronization**: Powered by **Supabase (PostgreSQL)**, allowing access from any device with real-time updates.
- **Smart Attendance Marking**: Mark attendance (Present, Absent, OD) with a single click and automatic timestamping.
- **Marks Management**: Comprehensive module for tracking student scores across multiple subjects and exam types with auto-grading.
- **Excel Reporting**: Generate professional, color-coded Attendance Reports (`.xlsx`) automatically, formatted for administrative use.
- **Dynamic Student Management**: Full CRUD (Create, Read, Update, Delete) with support for **custom profile columns** and avatars.
- **Role-Based Access**: Secured login system for Staff and Administrator roles with assigned year/section restrictions.
- **Automated Maintenance**: Built-in weekly cleanup routines to keep historical attendance data fresh and optimized.

## 🛠️ Technology Stack

- **Frontend**: Vanilla JavaScript, Semantic HTML5, CSS3 (Modern Responsive Layout)
- **Backend**: Node.js, Express.js
- **Database**: Supabase (Cloud PostgreSQL)
- **Exports**: ExcelJS for professional spreadsheet generation
- **Security**: Bcrypt.js for encrypted password storage

## ⚙️ Setup & Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/your-username/attendance-portal.git
   cd attendance-portal
