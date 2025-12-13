-- Migration: Auth Restructure
-- Changes signup to create admin accounts, adds username support,
-- makes email optional for employee accounts

-- Add username column (allow null initially for migration)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS username TEXT;

-- Add created_by column to track which admin created an employee
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.profiles(id);

-- Backfill username from email for existing profiles
UPDATE public.profiles
SET username = LOWER(SPLIT_PART(email, '@', 1))
WHERE username IS NULL AND email IS NOT NULL;

-- Make username required and unique after backfill
ALTER TABLE public.profiles ALTER COLUMN username SET NOT NULL;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_username_unique UNIQUE (username);

-- Make email nullable (for employee accounts that don't need email)
ALTER TABLE public.profiles ALTER COLUMN email DROP NOT NULL;

-- Add index for username lookups (login performance)
CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username);

-- Update the handle_new_user function to include username
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, username, first_name, last_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'username', LOWER(SPLIT_PART(NEW.email, '@', 1))),
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'admin')
  );
  RETURN NEW;
END;
$$;

-- Comment explaining the auth model
COMMENT ON TABLE public.profiles IS 'User profiles. Admins sign up publicly, employees are created by admins.';
COMMENT ON COLUMN public.profiles.username IS 'Unique username for login. Required for all users.';
COMMENT ON COLUMN public.profiles.email IS 'Email address. Required for admins, optional for employees.';
COMMENT ON COLUMN public.profiles.created_by IS 'For employees: the admin user ID who created this account.';
