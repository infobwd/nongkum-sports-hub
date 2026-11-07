# R24-C — Restricted local-file 155-page viewer & ID-safe deep links (7 Nov 2026)

**Status: PLAN RECORDED BEFORE CODE / STACKED ON PR #121 / NO MERGE / NO PUBLIC PDF RELEASE**

Current source checks:
- `main` is `339050dc6df494f22922ecc59a70a5a7dc8c9ab5`; R24 parent docs PR #120 Draft and R24-A/B PR #121 Draft. R24-C is a **stacked PR based on the branch of #121**, not a parallel edit of PR #116/#118.
- PDF V2 41 pages and V3 64 pages are kept intact. R24-A/B verified 155-page G2 SHA-256 `a2a9f47f8bf871403c3995e6b4ebd102802e600fc20c16198eb12ab73b12e89d`; 486 unique source-ID tokens = 236 active fixtures + 250 committee entries.
- Google Drive shows `access_not_verified` and does not provide enough permission metadata to declare the 155-page file publicly accessible. **Do not add Drive file IDs, public embedded PDF or private map to public GitHub**.

## Scoped private test method
1. Create `booklet-private-viewer.html` as a **user-selected local-file** PDF.js preview. The authorized organizer selects their own 155-page PDF and their private `R24B_155page_anchor_positions_PRIVATE_REVIEW.json` export; no upload/network request of these files. The application keeps bytes in current tab memory only.
2. Before opening any page or highlighting, validate **PDF bytes SHA256**, PDF page count 155, map source SHA, 486 token count and pinned **canonical token→page/rect checksum**. A bad PDF/map fails closed. On navigation, clear old highlights.
3. From program cards and committee rows, expose a quiet **“ตรวจในเล่มรวม (ผู้มีสิทธิ์)”** link within existing details, carrying only the stable row ID (`fixture` or `entry`) in a safe same-origin route. Verify that ID appears in the public source fixture/committee JSON before computing its SHA-1 anchor token; do not use names or score in URL. This is not a login system.
4. Highlight the corresponding table row in the verified local PDF, scroll and allow prev/next/zoom. PDF.js fetched only when user chooses local files, same version used by existing PDF readers. Note: local file selection must be repeated on a new page/load; Safari/LINE may have reduced file-picker support.
5. Keep R24-A/B document catalog status `restricted_review_pending_permission`: add a link to the **local-only viewer** but never a direct 155-page PDF URL or a public coordinate map. Retain the existing V2/V3 PDF links and R23/R19K behavior.
6. Add CI tests and a source PDF QA report, test SHA/map guards, ID-contract, no Drive URI, no unsafe redirects, no recording of private PDF bytes.

## Not in scope
- No public access grant/permission change in Drive, no PDF upload or re-authoring, no R11E approval, no physical mobile acceptance. No claims that matching documents mean organizer-approved facts.
- Do not Merge PR #121/#122 or #116/#118 without explicit approval. R24-C is an optional **private inspection bridge** pending authenticated Drive integration.
