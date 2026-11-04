import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildReconciliation, validateReconciliation } from './reconcile-program-r11a.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const read = (file) => JSON.parse(readFileSync(resolve(root, file), 'utf8'));
const previous = read('data/draft-schedule.json');
const staged = read('data/program-from-pdf-2569-20261104-draft.json');
const sheet = read('data/reconciliation/r11a-sheet-observation-20261104.json');
const committed = read('data/reconciliation/r11a-program-diff-20261104.json');
const r = buildReconciliation(previous, staged, sheet);
validateReconciliation(r);
assert.deepEqual(committed, r, 'Committed diff must match deterministic computation');
assert.deepEqual(r.added.map((x) => x.id),
  ['football-p07-มัธยมหญิง-020-repeated-final']);
assert.equal(r.summary.unchanged_core_count + r.summary.changed_core_count, 236);
assert.equal(r.summary.rows_with_qa_flags, 70);
assert.equal(r.summary.source_qa_codes, 11);
assert.deepEqual(r.source_year_anomalies.map((x) => x.source_date_iso),
  ['2025-11-17', '2025-11-17', '2025-11-17']);
assert.ok(r.source_year_anomalies.every((x) => x.draft_date === null));
assert.ok(r.planning.rows.every((x) => x.planning_date === x.candidate_pdf_date));
assert.deepEqual(
  new Set(r.planning.rows.map((x) => x.planning_date)),
  new Set(['2026-11-12', '2026-11-13'])
);
assert.equal(sheet.matches.review_rows_linked_to_confirmed_planning, 24);
assert.equal(sheet.matches.review_rows_match_times_in_sheet, 'blank');
assert.equal(sheet.athletics.unmatched_lane_ids_against_candidate, 0);
assert.equal(staged.metadata.all_data_approved, false);
assert.ok(staged.fixtures.every((x) => x.status === 'draft' && x.date === null));
assert.ok(!staged.fixtures.some((x) => x.status === 'approved'));
console.log('R11A test PASS: stable IDs, 181 changes, 24 planning preserved, source flags intact');
