-- Migration: Enable Supabase Realtime for cbt_exams table
-- This allows participants to receive live updates when admin changes
-- duration, scoring config, or session status.

-- Add cbt_exams to the supabase_realtime publication
-- (cbt_attempts is likely already added since force-submit works)
ALTER PUBLICATION supabase_realtime ADD TABLE public.cbt_exams;

-- Set REPLICA IDENTITY FULL so UPDATE payloads include both old and new row data
ALTER TABLE public.cbt_exams REPLICA IDENTITY FULL;
