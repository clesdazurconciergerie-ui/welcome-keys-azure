-- Make plan_id nullable in subscriptions table
-- This allows webhook to create subscriptions without requiring a plan_id
ALTER TABLE public.subscriptions ALTER COLUMN plan_id DROP NOT NULL;