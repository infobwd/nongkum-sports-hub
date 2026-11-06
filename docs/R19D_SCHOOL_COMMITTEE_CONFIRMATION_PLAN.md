# R19-D — GitHub Pages school-by-school committee draft review and confirmation

Date: 2026-11-06. **Plan first**: this document MUST be committed before code or data.
Scope: `infobwd/nongkum-sports-hub` GitHub Pages, no backend deployment assumed.

## Rationale
- User requests each of 8 schools to view their **own draft 2569 committee roster** and send a confirmation/correction.
- Public Repo and GitHub Pages are visible to everyone. Previously extracted PDF names from `ร่าง สูจิบัตร กีฬากลุ่ม 2569 .pdf` are **not yet approved for unprotected public display**. The existing `committee-roles-2569-planning.json` must remain aggregate-only (approved count 0).
- 250 named assignment rows in latest PDF; approx. 213 entries directly attributable to 8 participating schools by printed affiliation; others are outside/central/unknown and are NOT automatically assigned to a school.
- GitHub Pages cannot persist feedback securely on its own.

## Data partition / security
1. Use `committee_2569_draft_private_review.json` only as a private source for building eight school datasets. Include minimal fields: stable entry_id, printed name, affiliation, role, committee section/name, sport_id, PDF page, review flags. Do not include contact/ID, source raw text or Sillapa restricted register.
2. Encrypt each school's dataset separately using **PBKDF2-HMAC-SHA256 + AES-256-GCM** with a cryptographically random independent school passphrase, salt and nonce. Commit *only* encrypted bundles and public school IDs/counts. Keep passcodes in a separate organizer-only downloaded file, never Git/HTML/query string/localStorage/analytics.
3. Show no decrypted name before choosing the correct school and entering its secret. Decrypt via browser Web Crypto over GitHub Pages HTTPS. Never store passcodes/decrypted payload in cookies, localStorage, sessionStorage or remote analytics.
4. The 37 records that do not map directly to one of eight school affiliations remain **owner-only**; they are NOT imported into any school bundle and are not uploaded publicly in plaintext.
5. State strongly that this is **draft confirmation** for schools, not an approved order, not a real-time attendance record or official appointment.
6. A shared code is an access secret, **not identity proof**. Organizer verifies the message sender against the school before treating a confirmation as valid.

## UI / confirmation workflow
- Create `committee-review.html`, `css/committee-review.css`, `js/committee-review.js`.
- School dropdown, passphrase field, show/hide password, unlock button, per-school list grouped by committee and sport; search by name/section, badges for review flags, count and an optional note on each correction.
- Each row can be marked: ถูกต้อง / ขอแก้ไข / ไม่แน่ใจ. A school-level decision may be "ยืนยันตามร่าง" ONLY if all rows have been checked with no corrections; otherwise "ขอแก้ไข". Provide reviewer name and a summary.
- Confirmation action **opens LINE sharing UI with prepared message**, including school, source revision, row IDs, decisions and notes. Also copy text button fallback. School must send to the official organizer's known LINE chat/group and organizer must acknowledge. Do not falsely mark persisted or server-confirmed simply on button click. No backend is assumed.
- Mobile-first, readable cards with 48px+ controls and safe-area; link from committee report and home if useful, preserve program/results original bottom nav.

## Security/testing/rollout gates
- No plaintext personal names in Git commits, PR, HTML, workflow, public JSON or paths. No encryption passphrases in Repo.
- Unit test envelope counts, absence of sensitive/plaintext, UI state, confirmation message revision, LINE share flow.
- Source SHA-256 digest of roster / revision binds confirmation to specific draft; corrections refer to stable row entry IDs.
- Plan-first commit; code and test in second commit; open PR, require CI success, merge into main. Verify files on main.
- Cannot claim GitHub Pages on-device tests or live confirmation messages; owner must privately distribute 8 passphrases (e.g., school director LINE), collect replies and acknowledge.
- School codes may be rotated by regenerating bundles and committing new encrypted payloads.
- Existing P2, R10–R18, scores/program/results/standings and `js/navigation.js` unchanged.
