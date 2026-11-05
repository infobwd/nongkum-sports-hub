import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { analyzeRosterConflicts, publicSummary } from './analyze-roster-conflicts.mjs';

const load = (name) => JSON.parse(readFileSync(new URL('./fixtures/r12c-synthetic-' + name + '.json', import.meta.url), 'utf8'));
const program = load('program');
const roster = load('roster');
const config = load('config');
const copy = (v) => structuredClone(v);
const evaluate = (p = program, r = roster, c = config) => analyzeRosterConflicts(p, r, c);
const pair = (result, person, x, y) => result.details.find(d =>
  d.athlete_id === person && d.fixture_ids.includes(x) && d.fixture_ids.includes(y));
const report = evaluate();
assert.equal(report.public_summary.source_approval, 'SYNTHETIC_TEST_ONLY');
assert.equal(report.public_summary.schools_accepted, 2);
assert.equal(pair(report, 'SYN-ATH-001', 'SYN-FOOT-1', 'SYN-VOLLEY').status, 'hard_conflict');
assert.equal(pair(report, 'SYN-ATH-001', 'SYN-FOOT-1', 'SYN-FOOT-2').status, 'near_conflict');
assert.equal(pair(report, 'SYN-ATH-001', 'SYN-FINAL', 'SYN-FOOT-2').status, 'potential_conflict');
assert.equal(pair(report, 'SYN-ATH-002', 'SYN-FUTSAL', 'SYN-RELAY').status, 'hard_conflict');
assert.equal(pair(report, 'SYN-ATH-003', 'SYN-FOOT-1', 'SYN-FOOT-2').status, 'potential_conflict');
assert.equal(pair(report, 'SYN-ATH-004', 'SYN-RELAY', 'SYN-SPRINT').status, 'checked_no_conflict');
assert.equal(pair(report, 'SYN-ATH-005', 'SYN-CENTRE', 'SYN-SPRINT').status, 'checked_no_conflict');
assert.equal(report.public_summary.ready_to_claim_no_conflict, false);

// Names never establish identity: even identical text across schools is not used.
const names = copy(roster);
names.athletes[0].name_raw = 'SAME FAKE TEXT';
names.athletes[5].name_raw = 'SAME FAKE TEXT';
assert.deepEqual(evaluate(program, names, config).public_summary, report.public_summary);
assert.ok(!publicSummary(report).includes('SYN-ATH-001'));
assert.ok(!publicSummary(report).includes('SYN-FOOT-1'));
assert.ok(!publicSummary(report).includes('name_raw'));

// A blank timing, unverified lane or uncertain identity must never become clean.
let changed = copy(config);
changed.timings.find(x => x.fixture_id === 'SYN-RELAY').duration_minutes = null;
assert.equal(pair(evaluate(program, roster, changed), 'SYN-ATH-002',
  'SYN-FUTSAL', 'SYN-RELAY').status, 'unknown');
changed = copy(config);
changed.timings.find(x => x.fixture_id === 'SYN-FOOT-1').evidence_status = 'draft';
assert.equal(pair(evaluate(program, roster, changed), 'SYN-ATH-001',
  'SYN-FOOT-1', 'SYN-VOLLEY').status, 'potential_conflict');
let changedRoster = copy(roster);
changedRoster.lane_assignments = [];
assert.equal(evaluate(program, changedRoster).public_summary.unresolved_registration_checks > 0, true);
changedRoster = copy(roster);
changedRoster.athletes[0].identity_verified = false;
assert.equal(evaluate(program, changedRoster).public_summary.unresolved_registration_checks > 0, true);
changedRoster = copy(roster);
changedRoster.school_coverage[1].status = 'received';
assert.equal(evaluate(program, changedRoster).public_summary.coverage_complete, false);

// Same-school venues need grounded travel. A missing matrix is UNKNOWN, not safe.
changed = copy(config);
changed.travel = [];
assert.equal(pair(evaluate(program, roster, changed), 'SYN-ATH-001',
  'SYN-FOOT-2', 'SYN-VOLLEY').status, 'unknown');

// For linked registrations without simultaneous starts, travel can be physically impossible.
changed = copy(config);
changed.timings.find(x => x.fixture_id === 'SYN-FOOT-2').start = '09:55';
assert.equal(pair(evaluate(program, roster, changed), 'SYN-ATH-001',
  'SYN-FOOT-2', 'SYN-VOLLEY').status, 'hard_conflict');

// A true clean case requires all relevant verified fixtures, rules, and school coverage.
const cleanProgram = { schools: program.schools, fixtures: [
  program.fixtures.find(x => x.id === 'SYN-RELAY'),
  program.fixtures.find(x => x.id === 'SYN-SPRINT')
]};
const cleanRoster = copy(roster);
cleanRoster.athletes = [cleanRoster.athletes.find(x => x.athlete_id === 'SYN-ATH-004')];
const cleanConfig = copy(config);
cleanConfig.timings = cleanConfig.timings.filter(x => ['SYN-RELAY', 'SYN-SPRINT'].includes(x.fixture_id));
const clean = evaluate(cleanProgram, cleanRoster, cleanConfig);
assert.equal(clean.public_summary.ready_to_claim_no_conflict, true);
assert.equal(clean.public_summary.counts.checked_no_conflict, 1);
cleanConfig.timings[0].evidence_status = 'draft';
assert.equal(evaluate(cleanProgram, cleanRoster, cleanConfig).public_summary.ready_to_claim_no_conflict, false);

// Validation rejects duplicates, bad references, and a test-only/real-data mode mismatch.
changedRoster = copy(roster);
changedRoster.athletes.push(copy(changedRoster.athletes[0]));
assert.throws(() => evaluate(program, changedRoster, config), /duplicate athlete/);
changed = copy(config);
changed.timings.push(copy(changed.timings[0]));
assert.throws(() => evaluate(program, roster, changed), /duplicate timing/);
changed = copy(config);
changed.synthetic = false;
assert.throws(() => evaluate(program, roster, changed), /mode mismatch/);

// No invented maximum sport/event count: repeated registrations deduplicate same fixture.
changedRoster = copy(roster);
for (let i = 0; i < 15; i++) changedRoster.athletes[3].registrations.push({
  sport_id: 'athletics', role: 'relay_member', event_id: 'SYN-RELAY', lane: 1
});
const extra = evaluate(program, changedRoster, config);
assert.equal(pair(extra, 'SYN-ATH-004', 'SYN-RELAY', 'SYN-SPRINT').status, 'checked_no_conflict');

console.log('R12C synthetic-only checks PASS: multi-sport, team expansion, substitutes, relay, centre lane, conditional finals, identity, coverage, travel, rest, timing, redaction');
