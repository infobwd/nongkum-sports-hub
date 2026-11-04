import assert from 'node:assert/strict';
import { screenDraftProgram, renderReport } from './screen-draft-risk.mjs';

const sample = {
  metadata: { source_sha256: 'synthetic', source_status: 'test_draft' },
  schools: [{ id: 'schoolA', name: 'ตัวอย่าง ก' }, { id: 'schoolB', name: 'ตัวอย่าง ข' }],
  fixtures: [
    { id: 'm1', kind: 'match', sport_id: 'football', team_a_id: 'schoolA', team_b_id: 'schoolB', draft_date: '2026-11-17', draft_time: '09:00' },
    { id: 'm2', kind: 'match', sport_id: 'volleyball', team_a_id: 'schoolA', team_b_id: 'schoolB', draft_date: '2026-11-17', draft_time: '09:00' },
    { id: 'm3', kind: 'match', sport_id: 'takraw', team_a_id: 'schoolA', team_b_id: 'schoolA', draft_date: '2026-11-17', draft_time: '09:30' },
    { id: 'm4', kind: 'match', sport_id: 'futsal', team_a_id: null, team_b_id: 'schoolA', draft_date: '2026-11-18', draft_time: '09:00' },
    { id: 'a1', kind: 'track_event', sport_id: 'athletics', draft_date: '2026-11-16', draft_time: null, lanes: [{ lane: 1, school_id: 'schoolA', vacant: false }] }
  ]
};
const r = screenDraftProgram(sample);
assert.equal(r.stats.fixtures, 5);
assert.equal(r.stats.same_start_school_groups, 2);
assert.equal(r.stats.near_start_school_pairs, 2); // A has m1/m3 and m2/m3; B has no m3
assert.equal(r.stats.unresolved_match_team_refs, 1);
assert.equal(r.stats.missing_draft_time, 1);
assert.equal(r.stats.athletics_lane_rows, 1);
assert.equal(r.interpretation.athlete_conflicts_confirmed, false);
assert.equal(r.same_start_school_groups[0].fixture_ids.length, 2);
assert.equal(screenDraftProgram(sample, 29).stats.near_start_school_pairs, 0);
assert.equal(renderReport(r), renderReport(screenDraftProgram(sample)));
assert.ok(!renderReport(r).includes('display_name_private'));
assert.throws(() => screenDraftProgram({ ...sample, fixtures: [...sample.fixtures, sample.fixtures[0]] }), /duplicate/);
assert.throws(() => screenDraftProgram(sample, 0), RangeError);
assert.equal(screenDraftProgram({ ...sample, fixtures: [{ ...sample.fixtures[0], draft_date: '2026-02-30' }] }).stats.missing_draft_date, 1);
console.log('R12A synthetic fixtures PASS');
