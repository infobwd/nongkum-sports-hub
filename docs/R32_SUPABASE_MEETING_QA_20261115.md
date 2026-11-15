# R32 QA — Supabase Meeting sports results (15 พฤศจิกายน 2569)

## Current status (separate evidence gates)
- PLAN: `docs/R32_SUPABASE_MEETING_RESULTS_PLAN_20261115.md` committed **before** code/migrations.
- DB DEVELOPMENT + APPLIED: three additive Supabase migrations executed on Meeting ref `zprxvpfkvforoxrboqiv`: `r32_nongkum_results_inside_meeting_20261115`, `r32_nongkum_public_payload_guard_20261115`, `r32_audit_submission_fk_index_20261115`.
- GitHub DEVELOPMENT: PR **#142 OPEN**, not merged; new read-only frontend results source and safeguards.
- CI: R32 test and eight existing regressions passed on previous code head; **re-run/check latest PR head after this report** before any merge.
- LIVE SITE: GitHub Pages remains on the previous version; R32 not deployed.
- DEVICE ACCEPTED: **NO**. No Android/iPhone/LINE field verification yet.
- ORGANIZER RESULT APPROVED: **0**; never simulated in production.

## Verified database / safety checks
- Existing Meeting tables not modified. Dedicated `nongkum_sports.result_submissions` and `nongkum_sports.result_approval_audit` are private and have RLS enabled, with no anon/auth usage or policies (intentional fail-closed).
- `public.nongkum_published_results` has RLS enabled; `anon` SELECT **true**, anon INSERT/UPDATE **false**, authenticated UPDATE **false**.
- `anon` schema usage on `nongkum_sports`: **false**. `anon` execution of `approve_and_publish`: **false**. Function uses `SECURITY INVOKER`, not `SECURITY DEFINER`.
- SQL readback: public approved 0; private intake 0; approval audit 0.
- SQL function read-only tests: ordinary public approved score **allowed**; unknown athlete/private field **rejected**; private key embedded inside per-set JSON **rejected**. No simulated score row was inserted.
- Strict fields allowlist in published payload and browser render, revision check, explicit human approver and approval reference required. Server-only function stores before/after revision in private audit in a single transaction.
- Supabase Security Advisor after migration still has unrelated Meeting `authenticated_security_definer_function_executable` warnings (34), and password protection warning. R32 creates **no additional security-definer** functions; those unrelated warnings should be reviewed separately.
- Supabase Performance Advisor initially found missing FK index on new approval audit; fixed with additive R32 index migration. Unused-index informational notices on the empty tables are expected.
- No secrets, SMIS codes, athlete identities or private evidence sent to GitHub. Frontend holds **publishable key only**, correct for RLS-guarded SELECT.

## Frontend contract
- `js/results-source-r32.js` calls the Supabase read-only endpoint. It validates the approved-only payload against school/sport IDs from `data/public-results.json`, rejects any unknown fields, invalid result types or invalid scores.
- `results.html` and `standings.html` use the same source; standings still gates ranking snapshots on rule approval/digest integrity.
- Frontend checks updates every 60 seconds **only while page visible** (not true push-Realtime yet); app remains static GH Pages/PWA and Service Worker does not cache result data.
- If Supabase is unavailable, returns existing **approved-only** JSON as visibly labeled backup; if Supabase successfully responds with zero results, shows zero. A pre-existing nonempty static result file triggers pre-cutover backup handling.
- `scripts/ux/test-results-source-r32.mjs`: asserts empty real set, approved-only happy path **in synthetic test memory only**, no endpoint write, rejected malformed/private fields, network fallback, and old app compatibility.
- CI regressions updated only for changed user-facing source label, 60-second interval, and versioned standings JS.

## Remaining acceptance gate
1. Review PR #142 and latest CI; Merge only on user authorization.
2. After Merge, verify actual Supabase REST GET with publishable key and GH Pages functionality under Chrome/Safari/LINE; measure mobile latency and outage mode.
3. Receive a **genuine** signed/referee-verified score, confirm original fixture ID and schools vs current organizer sources, store it in private review queue, request human approval explicitly, publish, compare live UI + standings behavior.
4. Reconcile any Google Sheets approved results into the same private review queue. R20 Apps Script has not been verified installed; do not claim otherwise.
5. Keep Meeting project security-advisor remediation separate from sports changes.
