# R12 — Review share feedback and LINE preview QA
Status: candidate implementation; data remains **unapproved** until organizer review.
Source: data/program-from-pdf-2569-20261104-draft.json (237 items).

## Changes
- Issue button copies an editable report; a visible toast says it is **not sent**.
- Share button uses native share sheet when available, with clipboard fallback.
- Separate "คัดลอกข้อความ+ลิงก์" action creates LINE-friendly sport, pairing, source date/time/field, PDF page and warning.
- Candidate previews use new /r/fXXXXXXXX/ static Open Graph pages and browser redirect into review.html?fixture=ID.
- Existing /m/fXXXXXXXX/ 236 previews for the former program are intentionally unchanged.
- Fixed snackbar above mobile 3-tab navigation, never inside iOS status-bar/Dynamic Island.

## Automated checks
- node scripts/share/build-review-pages.mjs --check
- node scripts/ux/test-review-share-r12.mjs
- Existing R11D, R8 and project validate workflow.

## Manual acceptance after GitHub Pages deployment
1. Open review.html on an actual iPhone Safari and LINE in-app browser, scroll to a match, tap "แจ้งข้อมูลไม่ตรง": toast visible above bottom nav, Clipboard contains editable issue report, no submission claimed.
2. Tap "แชร์รายการนี้": native share chooser opens if available, choose LINE. If native share is unavailable, text plus an ASCII /r/.../ URL is copied with immediate toast.
3. In LINE, inspect the message and the URL preview: matching sport, division, pair/event, date/time/venue *as written in PDF*, page number and draft warning.
4. Tap the /r/.../ URL in LINE: should redirect into review.html?fixture=... and show exact matching review card before listing. Check repeated football item and athletics event as well.
5. On desktop click "คัดลอกข้อความ+ลิงก์": toast and full message work. Deny clipboard permission to verify manual-copy fallback.
6. Check old /m/.../ links and PDF Reader still work. LINE can cache older Open Graph cards; a fresh /r/.../ URL should be used in QA.
7. On iOS test PDF preview focus/close and toast positioning with Dynamic Island; check the top status area remains unobstructed.

Never treat this deployment as approval of the revised schedule or official publication.
