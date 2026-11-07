# R24-A/B Implementation Scope — three-version document catalog and 155-page integrity audit (2026-11-07)

**Status: IMPLEMENTATION BRANCH / not merged / not deployed / organizer data approval pending**

Parent plan: [R24 PR #120](https://github.com/infobwd/nongkum-sports-hub/pull/120), `docs/R24_THREE_VERSION_BOOKLET_REVIEW_HUB_PLAN_20261107.md` (still draft; avoid editing it or #116/#118 source files). main starting SHA `339050dc6df494f22922ecc59a70a5a7dc8c9ab5`.

## R24-A agreed implementation boundaries
- Add one entry `เอกสารสูจิบัตร` to the existing “เพิ่มเติม” menu on the program page and create a **mobile-first, read-only** library page. No global navigation rewrite.
- Keep program V2 (41 pages) reader and its R23 fixture highlights; keep committee V3 (64 pages) reader and R19K highlights. No replacement of viewer routes or source PDF files.
- New 155-page card **visible but not publicly opened** until an access/rights decision. The Drive metadata reports `source_visibility_status=access_not_verified`; no token, private file ID, image of pupils or stored private link in public repo. Do not show a fake enabled link.
- Use public metadata registry with version, page count, source sha256, document status, access mode, viewer route when allowed. Explicitly distinguish comparing documents from approving them.

## R24-B independently verifiable input
- Private **G2 155-page review PDF** has SHA-256 `a2a9f47f8bf871403c3995e6b4ebd102802e600fc20c16198eb12ab73b12e89d`, 155 A4 pages, 486 unique tokens `v4[0-9a-f]{12}`, 175 table-of-contents targets.
- Before-cover **I10 155-page review PDF** has SHA-256 `0c052af59d73bbefbe66f43dd797f08c5041ef2c00733805cd95a1ffbce6edec`. Tokens and normalized page+rect positions are identical **486/486** across both local PDF sources, all present once. No 154 content pages moved by cover swap.
- Sorted-token SHA-256 (UTF-8, newline joined, no trailing newline) `21feb66eb393f6fa24f0012e9dd3052a7e8eabca84bf40c3a5c73a3dda380d99`. Validate separately from current raw 237 minus repeated football final → 236 IDs plus committee 250 IDs via SHA-1 token construction.
- Create standalone verify/export tool taking local authorized PDF inputs to re-run ID, SHA, page and coordinate audit. **Do not publish private PDF, Drive URL or committee names in the new audit output.** A verified coordinate map for later R24-C can be generated as an **opt-in private output** only.
- Cannot call B complete for the website deep-link until rights and access, even though token identities and positions pass. Must preserve R11E and mobile-device acceptance gates.

## Code and QA checks
- Add only `booklets.html`, `css/booklets.css`, `js/booklets.js`, `data/booklet-versions.json`, minimal `index.html` menu link, `scripts/booklets/`, R24 QA documentation and CI.
- Verify all original V2/V3 routes remain unchanged; fail closed on revision mismatch; HTML escaping through `textContent`; secure anchor `rel=noopener noreferrer`.
- CI with Node tests for catalog/route/legal status + source-data tokens digest (no private PDF) and separate local PyMuPDF audit QA that reports the verified results from real PDF read.
- **No Merge / no deploy** without permission; the previously opened PRs #116 and #118 are still draft and must remain untouched.
