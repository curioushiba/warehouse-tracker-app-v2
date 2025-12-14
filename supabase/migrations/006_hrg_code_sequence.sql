-- Migration: HRG Code Sequence for Custom QR Codes
-- Creates a sequence and function for generating HRG-XXXXX format codes

-- HRG Code Sequence (starts at 1, will produce HRG-00001, HRG-00002, etc.)
CREATE SEQUENCE IF NOT EXISTS hrg_code_sequence START 1;

-- HRG Code Generator Function
-- Returns format: HRG-XXXXX (5-digit zero-padded)
CREATE OR REPLACE FUNCTION public.generate_hrg_code()
RETURNS TEXT AS $$
BEGIN
  RETURN 'HRG-' || LPAD(nextval('hrg_code_sequence')::TEXT, 5, '0');
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.generate_hrg_code() TO authenticated;

COMMENT ON FUNCTION public.generate_hrg_code() IS 'Generates a unique HRG code in format HRG-XXXXX for custom item QR codes';
