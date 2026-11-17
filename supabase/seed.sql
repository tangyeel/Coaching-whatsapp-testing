-- ==============================================================================
-- GLOBAL ADMIN & DEMO SEED SCRIPT
-- ==============================================================================

-- Instructions:
-- 1. Sign up your Global Admin user via the portal login / signup (or create via Supabase Auth Dashboard).
-- 2. Once the user is created in auth.users, execute this query to promote the user to 'global_admin':

-- UPDATE public.profiles
-- SET role = 'global_admin', institute_id = NULL
-- WHERE email = 'your_admin_email@example.com';

-- Helper function to promote any user to global_admin:
CREATE OR REPLACE FUNCTION public.make_global_admin(user_email TEXT)
RETURNS VOID AS $$
BEGIN
    UPDATE public.profiles
    SET role = 'global_admin',
        institute_id = NULL
    WHERE email = user_email;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
