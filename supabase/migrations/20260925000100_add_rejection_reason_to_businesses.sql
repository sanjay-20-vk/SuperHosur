-- Phase 15 Step 3: Add rejection_reason text column to businesses table for admin moderation feedback

alter table public.businesses
  add column if not exists rejection_reason text;

comment on column public.businesses.rejection_reason is 'Detailed feedback from an administrator explaining why the business listing was rejected.';
