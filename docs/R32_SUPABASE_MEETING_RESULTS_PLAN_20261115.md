# R32 — Supabase Meeting bridge for approved sports results (15 พฤศจิกายน 2569)

**Decision:** Organizer selected **Option A: reuse existing Supabase project Meeting** (project ref `zprxvpfkvforoxrboqiv`). Supersedes the choice of a separate project in R20 for the new channel **without deleting** the Google Sheets/ChatGPT/GitHub workflow. **Do not merge automatically.**

## Verified baseline
- Repo `main` after R31 PR #140/#141: `results.html` and `standings.html` read `data/public-results.json`; that file has **0 approved results**; page refresh is 5 minutes.
- R15 and R20 preserve manual image→ChatGPT intake, independent human approval, history, and approved-only public output.
- Meeting Supabase `ACTIVE_HEALTHY` in ap-south-1, PostgreSQL 17; it holds 25 meeting-related tables in `public`/`private`; no sports schema, no public `nongkum_%` tables. Do not modify meeting objects, their triggers, or existing grants/RLS.
- Open PRs #137, #138, #139, #136 etc are about fixtures/booklets. Avoid touching those source files; only change results reader, new SQL/JS/test, documentation.
- Existing security advisor warnings on Meeting need separate remediation, but **do not modify Meeting security functions as part of R32**.

## R32-A — isolated DB migration, private intake + public approved feed
- Private non-exposed `nongkum_sports` schema: `result_submissions` and append-only `result_approval_audit`. Store received score/photo references, revisions, reviewer identity and approval evidence only here.
- Public `public.nongkum_published_results` table: strictly sanitized approved result payloads, stable result ID, revision and published timestamp; RLS **SELECT-only** for `anon`/`authenticated`, no public INSERT/UPDATE/DELETE, service-role server-only access. No names, images, raw private evidence or school SMIS passwords in the public table.
- Server-only approval/publish function or verified operator transaction: requires explicit organizer approval, proper result ID and source fixture/event verification, revision consistency, immutable audit history. No AI auto-approval. Never insert fictional results.
- Constrain payloads to existing schema (`score`, `sets`, `win_loss`, `ranking`), check nonnegative scores, approved-only.
- Postgres migration must be added to repo **before applying** to Meeting. Verify zero sports results and no Meeting table changes after migration.

## R32-B — read bridge for GitHub Pages/PWA
- Preserve GitHub Pages and R31 PWA. Provide public read-only REST endpoint with a Supabase **publishable** (not service-role) key, using explicit RLS.
- New shared results source fetches approved records; preserves local static school/sport labels; produces R15-compliant dataset for `results.html` and `standings.html`. Standings must not show stale/mismatched calculations.
- On remote failure use existing approved-only JSON as **clearly labeled backup**; never silently claim it is latest. Remote success with 0 rows means **0**, not fake results. No draft access in browser.
- Use modest polling at first; reserve Realtime (prefer Broadcast with proper authorization) for measured next phase to avoid unwanted free-tier usage. No secret in any frontend.
- Do not rewrite program fixtures, results JSON, committee, PDFs, booklets or existing Google Sheets.

## R32-C — verification and acceptance
- Tests for DB boundaries: anon can SELECT approved feed, cannot write it, cannot read private submissions. Test without inserting invented results into production.
- JS tests: 0 approved, sanitized, invalid response rejected, fallback uses approved-only snapshot and visible backup label, and fixture ID matching/standings gate preserved.
- GitHub Actions CI and branch QA; PR for review; organizer permission required for Merge.
- Live GitHub Pages QA and ChatGPT→review→approval→publication with a real signed/confirmed result **pending actual evidence**; result public count stays 0 until then. No staging with fabricated matches.
- Preserve and reconcile R20 Google Sheets as a non-deployed fallback; do not claim apps script deployed.

## Status
- PLAN recorded before any DB or code changes.
- During development mark migration applied / CI passed / PR open separately; merge, deployment and device acceptance must be evidenced independently.
