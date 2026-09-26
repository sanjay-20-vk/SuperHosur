-- Enforce Quote Withdrawal Irrevocability & Lifecycle Security

create or replace function public.check_quote_submission_lifecycle()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_req_status text;
begin
  select status into v_req_status
  from public.requirements
  where id = new.requirement_id;

  if v_req_status is null then
    raise exception 'Requirement not found.';
  end if;

  -- Block new quotes on closed, completed, cancelled, or expired requirements
  if TG_OP = 'INSERT' then
    if v_req_status in ('closed', 'completed', 'cancelled', 'expired') then
      raise exception 'This requirement is % and is no longer accepting quotations.', v_req_status;
    end if;
  end if;

  -- Prevent reverting a withdrawn quote back to submitted or accepted
  if TG_OP = 'UPDATE' and old.status = 'withdrawn' and new.status <> 'withdrawn' and auth.role() <> 'service_role' then
    raise exception 'A withdrawn quotation cannot be reactivated.';
  end if;

  -- If requirement is closed or cancelled, prevent quote updates except withdrawing
  if TG_OP = 'UPDATE' and v_req_status in ('closed', 'completed', 'cancelled', 'expired') and auth.role() <> 'service_role' then
    if new.status <> 'withdrawn' and old.status <> 'withdrawn' then
      raise exception 'Cannot modify quotes on a % requirement.', v_req_status;
    end if;
  end if;

  return new;
end;
$$;
