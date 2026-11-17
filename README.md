# Coaching & School Portal (Production)

> **Enterprise-grade, multi-tenant academic management and guardian communication platform tailored for coaching institutes, tuition academies, and schools.**

[![Next.js](https://img.shields.io/badge/Next.js-14.2.3-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-18-blue?style=for-the-badge&logo=react)](https://react.dev/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL%20%2B%20RLS-3ECF8E?style=for-the-badge&logo=supabase)](https://supabase.com/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.4-38B2AC?style=for-the-badge&logo=tailwind-css)](https://tailwindcss.com/)
[![Meta WhatsApp Cloud API](https://img.shields.io/badge/WhatsApp%20Cloud%20API-v21.0-25D366?style=for-the-badge&logo=whatsapp)](https://developers.facebook.com/docs/whatsapp/cloud-api)

---

## 📌 Executive Overview

This portal transforms routine academic operations into a streamlined, durable, and auditable system:
* **No more spreadsheets for routine workflows**: Attendance, marks, fee ledgers, and student rosters are durably stored in PostgreSQL with Row Level Security (RLS).
* **Guaranteed Multi-Tenancy**: Complete cryptographic data isolation between different coaching institutes using `institute_id` RLS policies.
* **Three-Tier Role Scoping**:
  * **Global Admin**: Provision new institutes in 60 seconds, manage platform-wide tenant health, and inspect system telemetry.
  * **Institute Admin**: Comprehensive control over cohorts, staff, student directory, fee invoicing, manual Cash/UPI collection, and official receipt generation.
  * **Teacher**: Streamlined, zero-clutter workspace displaying strictly assigned batches for rapid attendance ticking and assessment scoring.

---

## 🚀 Key Modules & Capabilities

### 1. Rapid Attendance Ticking & Holiday Exclusion
* **One-Click Ticking**: Quick "Mark All Present" button + instant Yes/No status toggle per student row.
* **Holiday Marking Switch**: Mark any session as a Holiday with an optional title (e.g., "Diwali Break").
* **Accurate Net Active Calculation**: Holidays are automatically omitted from the denominator:
  $$\text{Attendance \%} = \frac{\text{Sessions Marked 'present'}}{\text{Total Sessions} - \text{Holiday Sessions}} \times 100$$
* **Absence Alerts**: Single-click WhatsApp alerts dispatched directly to parents of absent students.

### 2. Assessment Scoring & Report Card Engine
* **Bulk Marks Entry**: Clean scoring table with out-of-bounds validation (`marks <= max_marks`) and auto-calculated grades (`A+` through `F`).
* **Excel Marks Importer**: Upload `.xlsx` or `.xls` exam score sheets to auto-match students by Roll No or Name and fill scores in one click.
* **Marks WhatsApp Updates**: Single-click parent notifications with standardized parameters: `student_name`, `test_name`, `max_marks`, `marks_obtained`, `test_date`.
* **Printable / PDF Report Cards**: Branded report cards featuring attendance rates, test performance breakdown, teacher remarks, and authorized seal placeholders.

### 3. Student Roster & Transfer Safeguards
* **Batch-Centric Domain**: Simplified directly to operational cohorts (e.g., "Class 10 - Morning", "NEET Droppers").
* **Anti-Accidental Transfer Safeguard**: Student batch changes require an explicit confirmation modal with a recorded reason, permanently audited in `student_batch_transfers`.
* **Excel Bulk Student Importer**: Drag & drop `.xlsx`/`.xls` rosters with column auto-mapping (`Name`, `Phone`, `Roll`, `Guardian`) and pre-import validation.
* **Student Profile 360**: 360-degree view of any student's complete academic performance, batch transfer history, and full financial ledger.

### 4. Fee Invoicing, Payments & Branded Receipts
* **Invoicing**: Auto-incrementing invoice generation (`INV-YYYY-XXXXX`) with custom institute prefix support.
* **Multi-Mode Payment Recording**: Record payments via Cash, UPI (GPay/PhonePe), Bank Transfer, Cheque, or Online Gateway.
* **Automatic Ledger Reconcile**: PostgreSQL database trigger automatically synchronizes invoice status (`unpaid`, `partial`, `paid`) upon payment insertion.
* **Printable Branded Receipts**: Generates official payment receipts (`REC-YYYY-XXXXX`) ready for printing or saving as PDF with student/institute metadata.
* **WhatsApp Fee Reminders**: Direct single-click WhatsApp reminders dispatched to parents of students with outstanding dues.

### 5. Resilient WhatsApp Cloud API Engine
* **Meta Graph API v21.0**: Native Cloud API integration.
* **Asynchronous Queue & Idempotency**: Outbound messages are tracked via `message_jobs` and `message_recipients` with unique idempotency keys (`job:student:phone:timestamp`) to prevent duplicate sends on network retries.
* **Auditable Outbox**: Live log displaying dispatch timestamp, recipient counts, delivery success/failure counts, and error details.

---

## 🏛️ System Architecture

```mermaid
flowchart TD
  subgraph Client [Web Interface]
    GA[Global Admin: /admin]
    IA[Institute Admin: /dashboard]
    T[Teacher: /teacher]
  end

  subgraph API [Next.js Route Handlers]
    Auth[Auth & Context Middleware]
    InstitutesAPI[/api/admin/institutes]
    BatchesAPI[/api/batches]
    StudentsAPI[/api/students]
    AttendanceAPI[/api/attendance/sessions]
    AssessmentsAPI[/api/assessments]
    FeesAPI[/api/fees/invoices & payments]
    MessagesAPI[/api/messages/send & history]
    PingAPI[/api/ping]
  end

  subgraph Storage [Supabase Postgres with RLS]
    DB_Tenancy[(institutes, profiles)]
    DB_Roster[(batches, teacher_assignments, students, transfers)]
    DB_Academic[(attendance_sessions, records, assessments, results)]
    DB_Finance[(fee_invoices, fee_payments)]
    DB_Queue[(message_jobs, message_recipients)]
  end

  Client --> Auth
  Auth --> API
  API --> Storage
  MessagesAPI -->|Meta Graph API v21.0| WhatsApp[Meta WhatsApp Cloud API]
```

---

## 🗄️ Database Schema & RLS Security

The database is built from [supabase/schema.sql](file:///e:/Whatsapp_Production/school-portal/supabase/schema.sql) and includes 13 production tables:

| Table | Purpose |
|---|---|
| `institutes` | Tenant identity, branding, custom prefixes (`INV`, `REC`), and Meta WhatsApp credentials |
| `profiles` | User accounts linked to Supabase Auth with roles (`global_admin`, `institute_admin`, `teacher`) |
| `batches` | Cohorts and coaching batches with academic year tags |
| `teacher_batch_assignments`| Many-to-many junction table scoping teachers strictly to assigned cohorts |
| `students` | Student details, enrollment dates, and normalized guardian WhatsApp numbers |
| `student_batch_transfers` | Permanent audit log for batch moves (`from_batch`, `to_batch`, `reason`, `transferred_by`) |
| `attendance_sessions` | Batch attendance events with one-click holiday flags (`is_holiday`, `holiday_title`) |
| `attendance_records` | Per-student attendance status (`present`, `absent`) |
| `assessments` | Exam metadata (subject, max marks, date) |
| `assessment_results` | Student scores, calculated grades, and teacher remarks |
| `fee_invoices` | Invoices with auto-incrementing numbers and balance due |
| `fee_payments` | Payment receipts with payment mode (Cash, UPI, Cheque, Bank Transfer) |
| `message_jobs` & `message_recipients` | Queue, idempotency keys, delivery status, and Meta message IDs |
| `plan_defaults` | Pre-configured message tiers (Starter: 500, Growth: 2,000, Pro: 5,000, Enterprise: 15,000, Custom) |

---

## ⚡ Quickstart Guide

### 1. Database Setup
1. Create a project on [Supabase](https://supabase.com).
2. Navigate to **SQL Editor** in your Supabase dashboard.
3. Paste the contents of `supabase/schema.sql` and click **Run**.
4. Paste the contents of `supabase/schema_v2.sql` (v2.0 Addendum: Soft Deletes, Quota Governance, Branding & Autopilot) and click **Run**.
5. Elevate your primary developer account to `global_admin` using `supabase/seed.sql`:
   ```sql
   SELECT public.make_global_admin('your-email@example.com');
   ```

### 2. Environment Variables
Create a `.env.local` file in the root directory:
```env
NEXT_PUBLIC_SUPABASE_URL=https://<your-project-id>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>

# Supabase Supavisor Transaction Pooler (Port 6543) for scaled serverless execution
SUPABASE_DB_URL=postgresql://postgres.[ref]:[password]@aws-0-ap-south-1.pooler.supabase.com:6543/postgres

# Cron Secret for automated keepalive and fee reminder crons
CRON_SECRET=your_super_secret_cron_token

# Platform Support Email (shown on upgrade prompts)
NEXT_PUBLIC_SUPPORT_EMAIL=support@yourportal.com
```

### 3. Local Development
```bash
npm install
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 4. Production Build Verification
```bash
npm run build
npm run start
```

---

## 🚢 Deployment to Vercel

1. Push this repository to GitHub.
2. Import the project into [Vercel](https://vercel.com).
3. Add the environment variables: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, and `CRON_SECRET`.
4. Deploy! The included `vercel.json` automatically configures three serverless cron jobs:
   * **Database Keep-Alive**: Daily at 06:00 UTC (`/api/ping`) to prevent Supabase inactivity pausing.
   * **Fee Reminder Autopilot**: Daily at 12:00 PM IST (06:30 UTC) (`/api/cron/fee-reminders`) to auto-dispatch 7-day, 2-day, and due-date alerts.
   * **Monthly Quota Reset**: 1st of each month at 23:30 IST (18:00 UTC) (`/api/cron/reset-quota`) to reset rolling monthly message counters.

---

## 📄 License
This project is proprietary and confidential. Built for coaching centers, schools, and academic academies.
