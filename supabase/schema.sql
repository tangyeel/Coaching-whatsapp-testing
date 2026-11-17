-- ==============================================================================
-- MULTI-INSTITUTE COACHING & SCHOOL PORTAL: INITIAL SCHEMA MIGRATION
-- Designed for Supabase PostgreSQL (Brand New Project)
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. HELPER FUNCTIONS: Updated At
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ==============================================================================
-- 3. CORE MULTI-TENANCY: INSTITUTES & PROFILES
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.institutes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    logo_url TEXT,
    address TEXT,
    contact_phone TEXT,
    whatsapp_token TEXT,
    phone_number_id TEXT,
    currency VARCHAR(10) NOT NULL DEFAULT 'INR',
    timezone VARCHAR(50) NOT NULL DEFAULT 'Asia/Kolkata',
    invoice_prefix VARCHAR(10) NOT NULL DEFAULT 'INV',
    receipt_prefix VARCHAR(10) NOT NULL DEFAULT 'REC',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER set_institutes_updated_at
BEFORE UPDATE ON public.institutes
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    institute_id UUID REFERENCES public.institutes(id) ON DELETE CASCADE,
    role VARCHAR(30) NOT NULL CHECK (role IN ('global_admin', 'institute_admin', 'teacher')),
    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER set_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==============================================================================
-- 4. ROSTER & BATCHES (BATCH-CENTRIC MODEL)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institute_id UUID NOT NULL REFERENCES public.institutes(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    subject_tags TEXT[] NOT NULL DEFAULT '{}',
    academic_year VARCHAR(20) NOT NULL DEFAULT '2026-2027',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER set_batches_updated_at
BEFORE UPDATE ON public.batches
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.teacher_batch_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institute_id UUID NOT NULL REFERENCES public.institutes(id) ON DELETE CASCADE,
    teacher_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    batch_id UUID NOT NULL REFERENCES public.batches(id) ON DELETE CASCADE,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (teacher_id, batch_id)
);

CREATE TABLE IF NOT EXISTS public.students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institute_id UUID NOT NULL REFERENCES public.institutes(id) ON DELETE CASCADE,
    batch_id UUID NOT NULL REFERENCES public.batches(id) ON DELETE CASCADE,
    roll_no TEXT,
    full_name TEXT NOT NULL,
    guardian_name TEXT,
    guardian_phone TEXT NOT NULL, -- Standard Indian Phone: 91XXXXXXXXXX
    student_phone TEXT,
    enrollment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER set_students_updated_at
BEFORE UPDATE ON public.students
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Student Batch Transfer Audit Log (Prevents Accidental Moves)
CREATE TABLE IF NOT EXISTS public.student_batch_transfers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institute_id UUID NOT NULL REFERENCES public.institutes(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    from_batch_id UUID NOT NULL REFERENCES public.batches(id) ON DELETE RESTRICT,
    to_batch_id UUID NOT NULL REFERENCES public.batches(id) ON DELETE RESTRICT,
    transferred_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    transfer_reason TEXT,
    transferred_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- 5. ATTENDANCE MODULE (ONE-CLICK TICK & HOLIDAY EXCLUSION)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.attendance_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institute_id UUID NOT NULL REFERENCES public.institutes(id) ON DELETE CASCADE,
    batch_id UUID NOT NULL REFERENCES public.batches(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    is_holiday BOOLEAN NOT NULL DEFAULT false,
    holiday_title TEXT,
    notes TEXT,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (batch_id, date)
);

CREATE TRIGGER set_attendance_sessions_updated_at
BEFORE UPDATE ON public.attendance_sessions
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.attendance_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES public.attendance_sessions(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    status VARCHAR(10) NOT NULL CHECK (status IN ('present', 'absent')),
    UNIQUE (session_id, student_id)
);

-- ==============================================================================
-- 6. MARKS & ASSESSMENTS MODULE
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.assessments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institute_id UUID NOT NULL REFERENCES public.institutes(id) ON DELETE CASCADE,
    batch_id UUID NOT NULL REFERENCES public.batches(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    subject TEXT NOT NULL,
    max_marks NUMERIC(6, 2) NOT NULL CHECK (max_marks > 0),
    date DATE NOT NULL,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER set_assessments_updated_at
BEFORE UPDATE ON public.assessments
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.assessment_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assessment_id UUID NOT NULL REFERENCES public.assessments(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    marks_obtained NUMERIC(6, 2) NOT NULL CHECK (marks_obtained >= 0),
    grade VARCHAR(10),
    remarks TEXT,
    UNIQUE (assessment_id, student_id)
);

-- ==============================================================================
-- 7. FEES, INVOICES & PAYMENT RECEIPTS (CASH & ONLINE READY)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.fee_invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institute_id UUID NOT NULL REFERENCES public.institutes(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    invoice_no VARCHAR(50) NOT NULL,
    title TEXT NOT NULL,
    amount_due BIGINT NOT NULL CHECK (amount_due >= 0), -- Amount in paise
    amount_paid BIGINT NOT NULL DEFAULT 0 CHECK (amount_paid >= 0),
    due_date DATE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'unpaid' CHECK (status IN ('unpaid', 'partial', 'paid', 'cancelled')),
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (institute_id, invoice_no)
);

CREATE TRIGGER set_fee_invoices_updated_at
BEFORE UPDATE ON public.fee_invoices
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.fee_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institute_id UUID NOT NULL REFERENCES public.institutes(id) ON DELETE CASCADE,
    invoice_id UUID NOT NULL REFERENCES public.fee_invoices(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    receipt_no VARCHAR(50) NOT NULL,
    amount BIGINT NOT NULL CHECK (amount > 0), -- Amount in paise
    payment_mode VARCHAR(20) NOT NULL CHECK (payment_mode IN ('cash', 'upi', 'bank_transfer', 'cheque', 'online')),
    reference_no TEXT,
    payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    collected_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (institute_id, receipt_no)
);

-- Trigger to Automatically Reconcile Invoice Status & Paid Amount
CREATE OR REPLACE FUNCTION sync_invoice_balance()
RETURNS TRIGGER AS $$
DECLARE
    target_invoice_id UUID;
    total_paid BIGINT;
    inv_due BIGINT;
BEGIN
    target_invoice_id := COALESCE(NEW.invoice_id, OLD.invoice_id);
    
    SELECT COALESCE(SUM(amount), 0) INTO total_paid
    FROM public.fee_payments
    WHERE invoice_id = target_invoice_id;

    SELECT amount_due INTO inv_due
    FROM public.fee_invoices
    WHERE id = target_invoice_id;

    UPDATE public.fee_invoices
    SET amount_paid = total_paid,
        status = CASE
            WHEN total_paid >= inv_due THEN 'paid'
            WHEN total_paid > 0 THEN 'partial'
            ELSE 'unpaid'
        END,
        updated_at = NOW()
    WHERE id = target_invoice_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_sync_invoice_balance_insert
AFTER INSERT OR UPDATE OR DELETE ON public.fee_payments
FOR EACH ROW EXECUTE FUNCTION sync_invoice_balance();

-- ==============================================================================
-- 8. ASYNC WHATSAPP QUEUE & RECIPIENTS
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.message_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institute_id UUID NOT NULL REFERENCES public.institutes(id) ON DELETE CASCADE,
    template_key VARCHAR(50) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
    total_count INTEGER NOT NULL DEFAULT 0,
    success_count INTEGER NOT NULL DEFAULT 0,
    failed_count INTEGER NOT NULL DEFAULT 0,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER set_message_jobs_updated_at
BEFORE UPDATE ON public.message_jobs
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.message_recipients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL REFERENCES public.message_jobs(id) ON DELETE CASCADE,
    student_id UUID REFERENCES public.students(id) ON DELETE SET NULL,
    phone TEXT NOT NULL,
    payload_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
    idempotency_key TEXT UNIQUE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'sent', 'failed')),
    provider_message_id TEXT,
    error_message TEXT,
    sent_at TIMESTAMPTZ
);

-- ==============================================================================
-- 9. PERFORMANCE INDEXES
-- ==============================================================================

CREATE INDEX IF NOT EXISTS idx_profiles_institute ON public.profiles(institute_id);
CREATE INDEX IF NOT EXISTS idx_batches_institute ON public.batches(institute_id);
CREATE INDEX IF NOT EXISTS idx_teacher_assignments_teacher ON public.teacher_batch_assignments(teacher_id);
CREATE INDEX IF NOT EXISTS idx_teacher_assignments_batch ON public.teacher_batch_assignments(batch_id);
CREATE INDEX IF NOT EXISTS idx_students_batch ON public.students(batch_id);
CREATE INDEX IF NOT EXISTS idx_students_institute ON public.students(institute_id);
CREATE INDEX IF NOT EXISTS idx_attendance_sessions_batch ON public.attendance_sessions(batch_id, date);
CREATE INDEX IF NOT EXISTS idx_attendance_records_session ON public.attendance_records(session_id);
CREATE INDEX IF NOT EXISTS idx_assessments_batch ON public.assessments(batch_id);
CREATE INDEX IF NOT EXISTS idx_assessment_results_assessment ON public.assessment_results(assessment_id);
CREATE INDEX IF NOT EXISTS idx_fee_invoices_student ON public.fee_invoices(student_id);
CREATE INDEX IF NOT EXISTS idx_fee_payments_invoice ON public.fee_payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_message_recipients_job ON public.message_recipients(job_id);

-- ==============================================================================
-- 10. ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

ALTER TABLE public.institutes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_batch_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_batch_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessment_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fee_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fee_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_recipients ENABLE ROW LEVEL SECURITY;

-- Helper security functions
CREATE OR REPLACE FUNCTION public.get_auth_role()
RETURNS TEXT AS $$
    SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.get_auth_institute_id()
RETURNS UUID AS $$
    SELECT institute_id FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- 10.1 Institutes Policies
CREATE POLICY "Global admin sees all institutes"
ON public.institutes FOR ALL
USING (public.get_auth_role() = 'global_admin');

CREATE POLICY "Institute users see their own institute"
ON public.institutes FOR SELECT
USING (id = public.get_auth_institute_id());

CREATE POLICY "Institute admin updates their institute"
ON public.institutes FOR UPDATE
USING (id = public.get_auth_institute_id() AND public.get_auth_role() = 'institute_admin');

-- 10.2 Profiles Policies
CREATE POLICY "Global admin manages all profiles"
ON public.profiles FOR ALL
USING (public.get_auth_role() = 'global_admin');

CREATE POLICY "Users read profiles in their institute"
ON public.profiles FOR SELECT
USING (institute_id = public.get_auth_institute_id() OR id = auth.uid());

CREATE POLICY "Institute admin manages profiles in their institute"
ON public.profiles FOR ALL
USING (institute_id = public.get_auth_institute_id() AND public.get_auth_role() = 'institute_admin');

-- 10.3 Batches Policies
CREATE POLICY "Global admin manages all batches"
ON public.batches FOR ALL
USING (public.get_auth_role() = 'global_admin');

CREATE POLICY "Institute admin manages batches in their institute"
ON public.batches FOR ALL
USING (institute_id = public.get_auth_institute_id() AND public.get_auth_role() = 'institute_admin');

CREATE POLICY "Teachers see only their assigned batches"
ON public.batches FOR SELECT
USING (
    institute_id = public.get_auth_institute_id() AND (
        public.get_auth_role() = 'institute_admin' OR
        id IN (SELECT batch_id FROM public.teacher_batch_assignments WHERE teacher_id = auth.uid())
    )
);

-- 10.4 Teacher Assignments Policies
CREATE POLICY "Institute admin manages teacher assignments"
ON public.teacher_batch_assignments FOR ALL
USING (
    public.get_auth_role() = 'global_admin' OR
    (institute_id = public.get_auth_institute_id() AND public.get_auth_role() = 'institute_admin')
);

CREATE POLICY "Teachers view their own assignments"
ON public.teacher_batch_assignments FOR SELECT
USING (
    institute_id = public.get_auth_institute_id() AND (
        teacher_id = auth.uid() OR public.get_auth_role() = 'institute_admin'
    )
);

-- 10.5 Students Policies
CREATE POLICY "Institute admin manages students"
ON public.students FOR ALL
USING (
    public.get_auth_role() = 'global_admin' OR
    (institute_id = public.get_auth_institute_id() AND public.get_auth_role() = 'institute_admin')
);

CREATE POLICY "Teachers see students in assigned batches"
ON public.students FOR SELECT
USING (
    institute_id = public.get_auth_institute_id() AND (
        public.get_auth_role() = 'institute_admin' OR
        batch_id IN (SELECT batch_id FROM public.teacher_batch_assignments WHERE teacher_id = auth.uid())
    )
);

-- 10.6 Attendance Sessions & Records Policies
CREATE POLICY "Manage attendance sessions"
ON public.attendance_sessions FOR ALL
USING (
    public.get_auth_role() = 'global_admin' OR
    (institute_id = public.get_auth_institute_id() AND (
        public.get_auth_role() = 'institute_admin' OR
        batch_id IN (SELECT batch_id FROM public.teacher_batch_assignments WHERE teacher_id = auth.uid())
    ))
);

CREATE POLICY "Manage attendance records"
ON public.attendance_records FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.attendance_sessions s
        WHERE s.id = attendance_records.session_id AND (
            public.get_auth_role() = 'global_admin' OR
            (s.institute_id = public.get_auth_institute_id() AND (
                public.get_auth_role() = 'institute_admin' OR
                s.batch_id IN (SELECT batch_id FROM public.teacher_batch_assignments WHERE teacher_id = auth.uid())
            ))
        )
    )
);

-- 10.7 Assessments & Results Policies
CREATE POLICY "Manage assessments"
ON public.assessments FOR ALL
USING (
    public.get_auth_role() = 'global_admin' OR
    (institute_id = public.get_auth_institute_id() AND (
        public.get_auth_role() = 'institute_admin' OR
        batch_id IN (SELECT batch_id FROM public.teacher_batch_assignments WHERE teacher_id = auth.uid())
    ))
);

CREATE POLICY "Manage assessment results"
ON public.assessment_results FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.assessments a
        WHERE a.id = assessment_results.assessment_id AND (
            public.get_auth_role() = 'global_admin' OR
            (a.institute_id = public.get_auth_institute_id() AND (
                public.get_auth_role() = 'institute_admin' OR
                a.batch_id IN (SELECT batch_id FROM public.teacher_batch_assignments WHERE teacher_id = auth.uid())
            ))
        )
    )
);

-- 10.8 Invoices & Receipts Policies (Institute Admin Only)
CREATE POLICY "Manage fee invoices"
ON public.fee_invoices FOR ALL
USING (
    public.get_auth_role() = 'global_admin' OR
    (institute_id = public.get_auth_institute_id() AND public.get_auth_role() = 'institute_admin')
);

CREATE POLICY "Manage fee payments"
ON public.fee_payments FOR ALL
USING (
    public.get_auth_role() = 'global_admin' OR
    (institute_id = public.get_auth_institute_id() AND public.get_auth_role() = 'institute_admin')
);

-- 10.9 Message Jobs & Recipients
CREATE POLICY "Manage message jobs"
ON public.message_jobs FOR ALL
USING (
    public.get_auth_role() = 'global_admin' OR
    institute_id = public.get_auth_institute_id()
);

CREATE POLICY "Manage message recipients"
ON public.message_recipients FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.message_jobs j
        WHERE j.id = message_recipients.job_id AND (
            public.get_auth_role() = 'global_admin' OR
            j.institute_id = public.get_auth_institute_id()
        )
    )
);
