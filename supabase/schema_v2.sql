-- ==============================================================================
-- MULTI-INSTITUTE COACHING & SCHOOL PORTAL: SCHEMA V2 ADDENDUM
-- Safe, additive migration: Soft deletes, Branding, Fee Autopilot & Quota Tracking
-- ==============================================================================

-- 1. SOFT DELETES (STUDENTS & BATCHES)
ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

ALTER TABLE public.batches
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- Index for active students & batches
CREATE INDEX IF NOT EXISTS idx_students_active 
  ON public.students(institute_id) 
  WHERE deleted_at IS NULL AND is_active = true;

CREATE INDEX IF NOT EXISTS idx_batches_active 
  ON public.batches(institute_id) 
  WHERE deleted_at IS NULL AND is_active = true;

-- Update RLS policies to respect deleted_at IS NULL on active reads
DROP POLICY IF EXISTS "Teachers see students in assigned batches" ON public.students;
CREATE POLICY "Teachers see students in assigned batches"
ON public.students FOR SELECT
USING (
  deleted_at IS NULL AND
  institute_id = public.get_auth_institute_id() AND (
    public.get_auth_role() = 'institute_admin' OR
    batch_id IN (SELECT batch_id FROM public.teacher_batch_assignments WHERE teacher_id = auth.uid())
  )
);

DROP POLICY IF EXISTS "Institute admin manages students" ON public.students;
CREATE POLICY "Institute admin manages students"
ON public.students FOR ALL
USING (
  public.get_auth_role() = 'global_admin' OR
  (deleted_at IS NULL AND institute_id = public.get_auth_institute_id() AND public.get_auth_role() = 'institute_admin')
);

-- 2. BRANDING COLUMNS
ALTER TABLE public.institutes
  ADD COLUMN IF NOT EXISTS logo_url TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS banner_color VARCHAR(10) DEFAULT '#1e3a5f';

-- 3. FEE REMINDER AUTOPILOT FLAGS
ALTER TABLE public.fee_invoices
  ADD COLUMN IF NOT EXISTS reminder_7d_sent BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS reminder_2d_sent BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS reminder_due_sent BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.institutes
  ADD COLUMN IF NOT EXISTS fee_reminder_autopilot BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_fee_invoices_autopilot 
  ON public.fee_invoices(due_date, status) 
  WHERE status IN ('unpaid','partial');

-- 4. MESSAGE QUOTA & PLAN TIERS
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'plan_tier') THEN
    CREATE TYPE public.plan_tier AS ENUM ('starter', 'growth', 'pro', 'enterprise', 'custom');
  END IF;
END$$;

CREATE TABLE IF NOT EXISTS public.plan_defaults (
  tier public.plan_tier PRIMARY KEY,
  label TEXT NOT NULL,
  msg_limit INTEGER NOT NULL,
  price_inr INTEGER NOT NULL DEFAULT 0
);

INSERT INTO public.plan_defaults (tier, label, msg_limit, price_inr) VALUES
  ('starter',    'Starter',    500,    0),
  ('growth',     'Growth',     2000,   0),
  ('pro',        'Pro',        5000,   0),
  ('enterprise', 'Enterprise', 15000,  0),
  ('custom',     'Custom',     0,      0)
ON CONFLICT (tier) DO NOTHING;

ALTER TABLE public.plan_defaults ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Global admin manages plan defaults" ON public.plan_defaults;
CREATE POLICY "Global admin manages plan defaults"
ON public.plan_defaults FOR ALL
USING (public.get_auth_role() = 'global_admin');

DROP POLICY IF EXISTS "Users read plan defaults" ON public.plan_defaults;
CREATE POLICY "Users read plan defaults"
ON public.plan_defaults FOR SELECT
USING (true);

ALTER TABLE public.institutes
  ADD COLUMN IF NOT EXISTS plan_tier public.plan_tier NOT NULL DEFAULT 'starter',
  ADD COLUMN IF NOT EXISTS msg_limit_override INTEGER DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS messages_sent_this_month INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS messages_month_reset_at DATE NOT NULL DEFAULT CURRENT_DATE;

CREATE INDEX IF NOT EXISTS idx_institutes_plan ON public.institutes(plan_tier);

-- Helper function: get effective monthly message limit (0 = unlimited)
CREATE OR REPLACE FUNCTION public.get_msg_limit(inst_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_override INTEGER;
  v_tier public.plan_tier;
  v_default INTEGER;
BEGIN
  SELECT msg_limit_override, plan_tier
  INTO v_override, v_tier
  FROM public.institutes WHERE id = inst_id;

  IF v_override IS NOT NULL THEN
    RETURN v_override;
  END IF;

  SELECT msg_limit INTO v_default FROM public.plan_defaults WHERE tier = v_tier;
  RETURN COALESCE(v_default, 500);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 5. PASSWORD FIRST-TIME SETUP FLAG ON PROFILES
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS password_changed BOOLEAN NOT NULL DEFAULT false;

-- 6. INDEXES FOR PLATFORM ANALYTICS
CREATE INDEX IF NOT EXISTS idx_message_jobs_month ON public.message_jobs(institute_id, created_at);
