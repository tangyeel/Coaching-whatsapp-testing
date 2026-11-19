-- ==============================================================================
-- CONSOLIDATED MVP MIGRATIONS (004 to 013)
-- Safe, additive migrations for Multi-Institute WhatsApp Automation Portal
-- ==============================================================================

-- 1. DEMO REQUESTS TABLE (from Landing Page CTA)
CREATE TABLE IF NOT EXISTS public.demo_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institute_name TEXT NOT NULL,
    contact_name TEXT NOT NULL,
    contact_phone TEXT NOT NULL,
    contact_email TEXT NOT NULL,
    student_count_estimate TEXT,
    notes TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'new', -- 'new', 'contacted', 'converted', 'archived'
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.demo_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Global admin reads demo requests" ON public.demo_requests;
CREATE POLICY "Global admin reads demo requests" ON public.demo_requests
FOR ALL USING (public.get_auth_role() = 'global_admin');

-- 2. STUDENT EMAIL COLUMN (for Email Fallback via Resend)
ALTER TABLE public.students 
  ADD COLUMN IF NOT EXISTS email TEXT DEFAULT NULL;

-- 3. SUBSCRIPTIONS TABLE (for Razorpay payments & plan billing)
CREATE TABLE IF NOT EXISTS public.subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institute_id UUID NOT NULL REFERENCES public.institutes(id) ON DELETE CASCADE,
    plan_tier VARCHAR(20) NOT NULL,
    amount_paise INTEGER NOT NULL,
    currency VARCHAR(10) NOT NULL DEFAULT 'INR',
    razorpay_order_id TEXT,
    razorpay_payment_id TEXT,
    razorpay_signature TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'pending', -- 'pending', 'paid', 'failed'
    valid_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    valid_until TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins view own subscriptions" ON public.subscriptions;
CREATE POLICY "Admins view own subscriptions" ON public.subscriptions
FOR SELECT USING (
  public.get_auth_role() = 'global_admin' OR
  institute_id = public.get_auth_institute_id()
);

-- 4. CUSTOM MESSAGE TEMPLATES PER INSTITUTE
CREATE TABLE IF NOT EXISTS public.message_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institute_id UUID NOT NULL REFERENCES public.institutes(id) ON DELETE CASCADE,
    template_key VARCHAR(50) NOT NULL,
    body TEXT NOT NULL,
    variables TEXT[] NOT NULL DEFAULT '{}',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(institute_id, template_key)
);

ALTER TABLE public.message_templates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins manage own templates" ON public.message_templates;
CREATE POLICY "Admins manage own templates" ON public.message_templates
FOR ALL USING (
  public.get_auth_role() = 'global_admin' OR
  (institute_id = public.get_auth_institute_id() AND public.get_auth_role() = 'institute_admin')
);

-- 5. BROADCASTS & ANNOUNCEMENTS
CREATE TABLE IF NOT EXISTS public.broadcasts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institute_id UUID NOT NULL REFERENCES public.institutes(id) ON DELETE CASCADE,
    created_by UUID REFERENCES public.profiles(id),
    batch_id UUID REFERENCES public.batches(id) ON DELETE SET NULL, -- NULL = all batches
    subject VARCHAR(200),
    body TEXT NOT NULL,
    sent_count INTEGER NOT NULL DEFAULT 0,
    failed_count INTEGER NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'pending', -- 'pending', 'sending', 'completed', 'failed'
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.broadcasts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins view own broadcasts" ON public.broadcasts;
CREATE POLICY "Admins view own broadcasts" ON public.broadcasts
FOR ALL USING (
  public.get_auth_role() = 'global_admin' OR
  (institute_id = public.get_auth_institute_id() AND public.get_auth_role() = 'institute_admin')
);

-- 6. AUDIT LOGS
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institute_id UUID REFERENCES public.institutes(id) ON DELETE CASCADE,
    actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    actor_email TEXT NOT NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50),
    entity_id UUID,
    entity_name TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_institute ON public.audit_logs(institute_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON public.audit_logs(created_at DESC);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins read audit logs" ON public.audit_logs;
CREATE POLICY "Admins read audit logs" ON public.audit_logs
FOR SELECT USING (
  public.get_auth_role() = 'global_admin' OR
  (institute_id = public.get_auth_institute_id() AND public.get_auth_role() = 'institute_admin')
);

-- 7. ONLINE ADMISSION LEADS
CREATE TABLE IF NOT EXISTS public.admissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institute_id UUID NOT NULL REFERENCES public.institutes(id) ON DELETE CASCADE,
    student_name TEXT NOT NULL,
    student_dob DATE,
    parent_name TEXT NOT NULL,
    parent_phone TEXT NOT NULL,
    parent_email TEXT,
    address TEXT,
    batch_id UUID REFERENCES public.batches(id) ON DELETE SET NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.admissions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins manage admissions" ON public.admissions;
CREATE POLICY "Admins manage admissions" ON public.admissions
FOR ALL USING (
  public.get_auth_role() = 'global_admin' OR
  (institute_id = public.get_auth_institute_id() AND public.get_auth_role() = 'institute_admin')
);

-- 8. WABA ID & TRIAL COLUMNS ON INSTITUTES
ALTER TABLE public.institutes 
  ADD COLUMN IF NOT EXISTS waba_id TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS signup_source VARCHAR(20) DEFAULT 'admin';

-- 9. MESSAGE INBOUND & DIRECTION SUPPORT
ALTER TABLE public.message_jobs 
  ADD COLUMN IF NOT EXISTS direction VARCHAR(10) NOT NULL DEFAULT 'outbound',
  ADD COLUMN IF NOT EXISTS inbound_text TEXT DEFAULT NULL;

-- 10. STUDENT USER AUTH LINK
ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
