# R19-D — school review portal QA and owner rollout (6 Nov 2026)

## Source and implementation
- Plan committed **before** code: `docs/R19D_SCHOOL_COMMITTEE_CONFIRMATION_PLAN.md`.
- Source is latest draft 2569 PDF, not schema-v3 schedule JSON and not an approved appointment order.
- Private organizer file `committee_2569_draft_private_review.json`: 250 individual role rows (151 normalized string-names, not identity-verified).
- 209 role rows with exactly one school affiliation mapped to 8 individually encrypted bundles. 41 rows are central/external/ambiguous/unspecified and remain **owner-only**, not exposed to school bundles.
- A field containing one school name does not prove identity or authorization; draft affiliation is a starting point for school review.
- Encrypted public JSON `data/committee-school-rosters-2569.encrypted.json` uses independent random 20-char codes, PBKDF2-SHA256 (210,000 iterations), AES-256-GCM, unique salts and IVs per school and GZIP compression. No codes, names, affiliations or notes appear in plaintext in the repository's data file.
- Decryption happens **in browser memory only** after choosing a school and entering its separate code. No browser storage, URL code parameters or server writes.
- `committee-review.html`: per-school draft list with source page, sport, duty, filter/search, states correct/change/unsure, row-level note on corrections, reviewer name and check-box. A bulk-mark button is convenient but does NOT substitute for organizer identity checks.
- LINE share and copy buttons prepare a text payload with revision + school id + row IDs/changed row notes. **No GitHub Pages write endpoint exists**; delivery occurs only when school sends it to organizer's existing LINE chat. No autonomous confirmation or accepted status on button press.

## Operator-only distribution
1. Download `สำหรับผู้จัด_R19D_private_pack.zip` from the task conversation; keep it private. It contains the eight passcodes plus an unmatched/outside-agency review JSON.
2. Send **only the specific school's passcode** to that school's designated coordinator in a private message, not in public groups, GitHub Issues, the repository, or the public app.
3. Send link to `committee-review.html`; schools select school, enter code, review rows, mark changes, enter their name and check review acknowledgement, then send prepared LINE message **to organizer chat**.
4. Organizer verifies sender separately (a school access code alone does not prove the person's identity), reconciles requested corrections and acknowledges receipt; only then decide on 2569 committee approval and publication.
5. For 41 central/external/ambiguous rows and any school missing names, organizer checks the source PDF and private remainder JSON.
6. If code leakage suspected, rotate and re-encrypt that school's dataset; never paste codes or plaintext names into GitHub.
7. Test on actual iOS Safari / LINE in-app browser and Android Chrome once GitHub Pages deploy is confirmed.

## Gate & acceptance
- JSON valid: exactly 8 unique school ids, 209 encrypted affiliation-matched role rows, PBKDF2/AES-GCM/GZIP; no plaintext personal roster/keys.
- Encryption/decryption roundtrip with **synthetic test-only secret** in CI; no production secret in test code.
- Test LINE status selection incomplete, correction missing note, all-correct and correction cases.
- No changes to program/results/standings/navigation or private Apps Script.
- New public UI only reports draft, doesn't mark `committee_approved` or persist user feedback.
- **Live acceptance** depends on owner sharing codes, school sending messages, and organizer verifying/acknowledging replies.
