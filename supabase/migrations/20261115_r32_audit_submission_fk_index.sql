-- R32C: targeted index to satisfy Supabase foreign-key performance advisor.
-- Does not touch any Meeting table or existing indexes.
create index if not exists nongkum_approval_audit_submission_idx
  on nongkum_sports.result_approval_audit(submission_id);
