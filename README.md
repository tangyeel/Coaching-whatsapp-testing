# Multi-Institute School & Coaching Portal (Production)

Turnkey, multi-tenant academic and communication platform tailored for coaching institutes, tuition centers, and schools.

---

## 🌟 Key Features

1. **Three-Tier Role Scoping**:
   * **Global Admin**: Rapid 60-second institute onboarding, tenant status management, and cross-platform health metrics.
   * **Institute Admin**: Comprehensive control over batches, student enrollment, fee invoicing, manual Cash/Online payment recording, and official receipt generation.
   * **Teacher**: Streamlined, zero-clutter workspace displaying strictly assigned batches. One-click attendance ticking, holiday marking, and assessment scoring.

2. **Durable Academic Records**:
   * **Batches-Only Architecture**: Direct hierarchy (`Institute -> Batches -> Students`) without redundant class layers.
   * **Transfer Safeguard**: Permanent transfer audit logging (`student_batch_transfers`) with explicit confirmation modals.
   * **Rapid Tick Attendance**: One-click "Mark All Present", quick toggles, and "Mark as Holiday" switch with automatic denominator adjustment:
     $$\text{Attendance \%} = \frac{\text{Present Count}}{\text{Total Sessions} - \text{Holiday Sessions}} \times 100$$
   * **Official Report Cards**: Instant calculation of attendance percentages, test averages, grades, and one-click printable/PDF report card generation.

3. **Invoicing & Cash/Online Receipt Engine**:
   * Native invoice generation (`INV-YYYY-XXXXX`) and payment receipt generation (`REC-YYYY-XXXXX`).
   * Supports Cash, UPI, Cheque, Bank Transfer, and Online Payment modes.
   * Automated PostgreSQL trigger reconciles invoice status (`unpaid`, `partial`, `paid`) upon recording payments.
   * Ready for zero-schema-change payment gateway integration.

4. **Reliable WhatsApp Cloud API Messaging**:
   * Native Meta Graph API `v21.0` integration with standardized template schemas (`marks_update`, `attendance_absent`, `fee_reminder`).
   * Asynchronous server-side job tracking (`message_jobs` & `message_recipients`) with unique idempotency keys to prevent duplicate sends on network retries.

---

## 🚀 Quickstart Guide

### 1. Database Setup (Supabase)
1. Create a brand-new project on [Supabase](https://supabase.com).
2. Open the **SQL Editor** tab.
3. Paste the contents of `supabase/schema.sql` and click **Run**.
4. (Optional) Run `supabase/seed.sql` to elevate your primary email to `global_admin`.

### 2. Environment Variables
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```
Configure your keys:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### 3. Local Development
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📦 Pushing to a New GitHub Repository

This directory is an independent git repository isolated from the legacy prototype:

```bash
cd E:\Whatsapp_Production\school-portal
git add .
git commit -m "feat: complete multi-institute school portal implementation"
git remote add origin https://github.com/your-username/your-new-repo.git
git branch -M main
git push -u origin main
```
