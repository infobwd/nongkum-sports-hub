/**
 * R11A — deterministic reconciliation of revised 2569 program with active site.
 *
 * Reads public, already-committed JSON only. Never reads or mutates Google Sheets
 * or approved results. The dated Sheets observation is a separate read-only
 * evidence snapshot; it is not a live source of truth.
 *
 * Usage:
 *   node scripts/data/reconcile-program-r11a.mjs          # print summary
 *   node scripts/data/reconcile-program-r11a.mjs --check  # verify committed snapshot
 *   node scripts/data/reconcile-program-r11a.mjs --write  # regenerate snapshot
 */
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const paths = {
  legacy: 'data/draft-schedule.json',
  candidate: 'data/program-from-pdf-2569-20261104-draft.json',
  sheets: 'data/reconciliation/r11a-sheet-observation-20261104.json',
  output: 'data/reconciliation/r11a-program-diff-20261104.json'
};
const compareFields = [
  'kind', 'sport_id', 'division', 'source_match_no', 'source_page',
  'source_pair_text', 'source_team_a_label', 'source_team_b_label',
  'team_a_id', 'team_b_id', 'round', 'date', 'time', 'field'
];
const planningFields = [
  'planning_date', 'planning_source', 'planning_status',
  'planning_date_confirmation', 'planning_venue',
  'planning_venue_confirmation'
];
const read = (path) => JSON.parse(readFileSync(resolve(root, path), 'utf8'));
const normalize = (x) => x === undefined ? null : x;
const same = (a, b) => JSON.stringify(normalize(a)) === JSON.stringify(normalize(b));
const count = (items, kind) => items.filter((x) => x.kind === kind).length;

function index(items, label) {
  const out = new Map();
  for (const item of items) {
    assert.ok(item.id && typeof item.id === 'string', label + ': missing fixture.id');
    assert.ok(!out.has(item.id), label + ': duplicate fixture.id ' + item.id);
    out.set(item.id, item);
  }
  return out;
}

export function buildReconciliation(legacy, candidate, sheetObservation) {
  assert.ok(Array.isArray(legacy.fixtures), 'active fixtures missing');
  assert.ok(Array.isArray(candidate.fixtures), 'candidate fixtures missing');
  assert.equal(candidate.metadata?.all_data_approved, false, 'candidate should not be approved');
  assert.equal(legacy.metadata?.all_data_approved, false, 'active draft should not be approved');
  const activeById = index(legacy.fixtures, 'active');
  const candidateById = index(candidate.fixtures, 'candidate');
  const bySport = {};
  const changeFields = {};
  const changes = [];
  const added = [];
  const removed = [];
  let unchanged = 0;
  let laneChanges = 0;
  for (const row of candidate.fixtures) {
    const previous = activeById.get(row.id);
    assert.equal(row.status, 'draft', 'candidate not draft: ' + row.id);
    assert.equal(row.review_status, 'draft', 'candidate review status not draft: ' + row.id);
    assert.equal(row.date, null, 'candidate approved date unexpectedly set: ' + row.id);
    assert.ok(row.source_pdf && row.source_pdf.page, 'missing provenance: ' + row.id);
    if (!previous) {
      added.push({
        id: row.id, kind: row.kind, sport_id: row.sport_id,
        source_page: row.source_page, source_match_no: row.source_match_no,
        source_pair_text: row.source_pair_text ?? null,
        pdf_date: row.source_pdf.source_date_text ?? null
      });
      continue;
    }
    const fieldDiff = {};
    for (const field of compareFields) {
      if (!same(previous[field], row[field])) {
        fieldDiff[field] = { active: normalize(previous[field]), candidate: normalize(row[field]) };
        changeFields[field] = (changeFields[field] || 0) + 1;
      }
    }
    if (row.kind === 'track_event' && !same(previous.lanes, row.lanes)) {
      fieldDiff.lanes = { active: normalize(previous.lanes), candidate: normalize(row.lanes) };
      changeFields.lanes = (changeFields.lanes || 0) + 1;
      laneChanges++;
    }
    if (Object.keys(fieldDiff).length) {
      changes.push({ id: row.id, sport_id: row.sport_id, changes: fieldDiff });
      const sport = bySport[row.sport_id] ?? { changed: 0, fields: {} };
      sport.changed++;
      for (const field of Object.keys(fieldDiff)) sport.fields[field] = (sport.fields[field] || 0) + 1;
      bySport[row.sport_id] = sport;
    } else unchanged++;
  }
  for (const row of legacy.fixtures) {
    if (!candidateById.has(row.id)) removed.push(row.id);
  }

  const plannedRows = legacy.fixtures.filter((row) =>
    planningFields.some((field) => normalize(row[field]) !== null)
  );
  const planningDifferences = [];
  const planning = plannedRows.map((row) => {
    const candidateRow = candidateById.get(row.id);
    assert.ok(candidateRow, 'planning fixture missing in candidate: ' + row.id);
    for (const field of planningFields) {
      if (!same(row[field], candidateRow[field])) {
        planningDifferences.push({ id: row.id, field,
          active: normalize(row[field]), candidate: normalize(candidateRow[field]) });
      }
    }
    return {
      id: row.id,
      planning_date: row.planning_date ?? null,
      planning_venue: row.planning_venue ?? null,
      candidate_pdf_date: candidateRow.draft_date ?? null,
      candidate_pdf_time: candidateRow.draft_time ?? null,
      source_match_no: candidateRow.source_match_no,
      source_page: candidateRow.source_page
    };
  });
  const candidateLanes = candidate.fixtures.filter((f) => f.kind === 'track_event')
    .reduce((sum, f) => sum + (f.lanes?.length || 0), 0);
  const activeLanes = legacy.fixtures.filter((f) => f.kind === 'track_event')
    .reduce((sum, f) => sum + (f.lanes?.length || 0), 0);
  const legacyIdsPreserved = legacy.fixtures.filter((x) => candidateById.has(x.id)).length;
  const yearAnomalies = candidate.fixtures.filter((f) =>
    String(f.source_pdf?.source_date_iso ?? '').startsWith('2025-')
  ).map((f) => ({
    id: f.id, source_page: f.source_page,
    source_date_text: f.source_pdf.source_date_text,
    source_date_iso: f.source_pdf.source_date_iso,
    draft_date: f.draft_date ?? null
  }));
  const qaRows = candidate.fixtures.filter((x) => x.qa_flags?.length);
  const duplications = {};
  for (const f of candidate.fixtures) {
    const key = f.sport_id + '|' + String(f.source_match_no);
    (duplications[key] ??= []).push(f.id);
  }
  const duplicateSourceNumbers = Object.entries(duplications)
    .filter(([, ids]) => ids.length > 1)
    .map(([key, ids]) => ({ sport_id: key.split('|')[0],
      source_match_no: key.split('|').slice(1).join('|'), ids }));
  const result = {
    schema: 'nongkum-r11a-reconciliation-v1',
    audit_date: '2026-11-04',
    release_state: 'audit_only_not_published',
    references: {
      active_json: paths.legacy, candidate_json: paths.candidate,
      source_pdf_sha256: candidate.metadata?.source_sha256 ?? null,
      sheet_snapshot: paths.sheets,
      canonical_candidate_revision: 'pdf69-20261104-draft-r11a'
    },
    summary: {
      active_total: legacy.fixtures.length,
      active_matches: count(legacy.fixtures, 'match'),
      active_track_events: count(legacy.fixtures, 'track_event'),
      active_track_lanes: activeLanes,
      candidate_total: candidate.fixtures.length,
      candidate_matches: count(candidate.fixtures, 'match'),
      candidate_track_events: count(candidate.fixtures, 'track_event'),
      candidate_track_lanes: candidateLanes,
      preserved_fixture_ids: legacyIdsPreserved,
      added_count: added.length, removed_count: removed.length,
      unchanged_core_count: unchanged, changed_core_count: changes.length,
      lane_changes: laneChanges,
      changed_fields: changeFields,
      changed_by_sport: bySport,
      planning_rows_preserved: plannedRows.length - planningDifferences.length,
      planning_conflicts: planningDifferences.length,
      rows_with_qa_flags: qaRows.length,
      source_qa_codes: candidate.source_qa?.length ?? 0,
      source_year_2025_anomalies: yearAnomalies.length,
      candidate_rows_approved: candidate.fixtures.filter((f) => f.status === 'approved').length
    },
    added, removed, changes,
    planning: { rows: planning, differences: planningDifferences },
    source_year_anomalies: yearAnomalies,
    duplicate_source_numbers: duplicateSourceNumbers,
    source_qa: (candidate.source_qa ?? []).map((q) =>
      ({ code: q.code, description: q.description, status: q.status })),
    sheets_observation: sheetObservation,
    interpretation: [
      'changed is a field difference, not proof the new PDF or old Sheet is correct',
      'candidate.source_pdf and draft_* are unapproved source values',
      '24 Sheet review rows do not imply committee approval',
      'Sheet observation is a dated read-only snapshot; re-check live Sheet before any write',
      'do not modify live website data, LINE share pages or public-results.json at R11A gate'
    ]
  };
  return result;
}

export function validateReconciliation(result) {
  const s = result.summary;
  assert.equal(s.active_total, 236);
  assert.equal(s.active_matches, 186);
  assert.equal(s.active_track_events, 50);
  assert.equal(s.active_track_lanes, 289);
  assert.equal(s.candidate_total, 237);
  assert.equal(s.candidate_matches, 187);
  assert.equal(s.candidate_track_events, 50);
  assert.equal(s.candidate_track_lanes, 289);
  assert.equal(s.preserved_fixture_ids, 236);
  assert.equal(s.added_count, 1);
  assert.equal(s.removed_count, 0);
  assert.equal(s.changed_core_count, 181);
  assert.equal(s.unchanged_core_count, 55);
  assert.equal(s.planning_rows_preserved, 24);
  assert.equal(s.planning_conflicts, 0);
  assert.equal(s.source_year_2025_anomalies, 3);
  assert.equal(s.candidate_rows_approved, 0);
  assert.equal(s.changed_fields.time, 181);
  assert.equal(s.changed_fields.source_match_no, 61);
  assert.equal(s.changed_fields.source_pair_text, 19);
  assert.equal(s.changed_fields.source_page, 16);
  assert.equal(s.changed_fields.field, 58);
  assert.equal(s.lane_changes, 0);
  assert.equal(result.sheets_observation?.matches?.total, 186);
  assert.equal(result.sheets_observation?.matches?.review, 24);
  assert.equal(result.sheets_observation?.matches?.approved, 0);
  assert.equal(result.sheets_observation?.athletics?.lane_rows, 289);
}

function main() {
  const result = buildReconciliation(read(paths.legacy), read(paths.candidate), read(paths.sheets));
  validateReconciliation(result);
  const outputPath = resolve(root, paths.output);
  if (process.argv.includes('--write')) {
    mkdirSync(dirname(outputPath), { recursive: true });
    writeFileSync(outputPath, JSON.stringify(result, null, 2) + '\n', 'utf8');
    console.log('Wrote ' + paths.output);
  } else if (process.argv.includes('--check')) {
    const existing = read(paths.output);
    assert.deepEqual(existing, result,
      'R11A snapshot has diverged: review changes, then regenerate with --write');
    console.log('R11A PASS: 237 candidate, 236 active, 24 planning rows preserved, no publication');
  } else {
    console.log(JSON.stringify(result.summary, null, 2));
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
