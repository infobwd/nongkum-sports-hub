// R12A: public-data-only screening. Do not import private athlete rosters here.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

const PROGRAM_URL = new URL('../../data/program-from-pdf-2569-20261104-draft.json', import.meta.url);
const REPORT_URL = new URL('../../data/analysis/r12a-school-time-risk-20261104.json', import.meta.url);
const cmp = (a, b) => a < b ? -1 : a > b ? 1 : 0;
const sortText = (values) => [...values].sort(cmp);
const parseTime = (value) => {
  if (typeof value !== 'string' || !/^([01][0-9]|2[0-3]):[0-5][0-9]$/.test(value)) return null;
  const [hour, minute] = value.split(':').map(Number);
  return hour * 60 + minute;
};
const validDate = (value) => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(value + 'T00:00:00Z');
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
};

export function screenDraftProgram(dataset, nearMinutes = 30) {
  if (!dataset || !Array.isArray(dataset.fixtures) || !Array.isArray(dataset.schools)) {
    throw new TypeError('Expected candidate program with fixtures and schools');
  }
  if (!Number.isInteger(nearMinutes) || nearMinutes < 1 || nearMinutes > 240) {
    throw new RangeError('nearMinutes must be an integer between 1 and 240');
  }
  const idSet = new Set();
  const calendar = new Map();
  const unknownFixtures = [];
  const unresolvedMatchTeams = [];
  const stats = {
    fixtures: 0, matches: 0, athletics_events: 0, athletics_lane_rows: 0,
    missing_draft_date: 0, missing_draft_time: 0,
    missing_date_or_time: 0, unresolved_match_team_refs: 0,
    confirmed_petanque_day_venue_only: 0, valid_school_time_entries: 0,
    same_start_school_groups: 0, near_start_school_pairs: 0
  };
  for (const fixture of dataset.fixtures) {
    if (!fixture || typeof fixture.id !== 'string' || !fixture.id || idSet.has(fixture.id)) {
      throw new Error('Missing or duplicate stable fixture.id');
    }
    idSet.add(fixture.id);
    if (!['match', 'track_event'].includes(fixture.kind)) {
      throw new Error('Unexpected fixture kind: ' + fixture.id);
    }
    stats.fixtures += 1;
    if (fixture.kind === 'match') stats.matches += 1;
    else {
      stats.athletics_events += 1;
      stats.athletics_lane_rows += Array.isArray(fixture.lanes) ? fixture.lanes.length : 0;
    }
    const day = validDate(fixture.draft_date) ? fixture.draft_date : null;
    const at = parseTime(fixture.draft_time);
    const missing = [];
    if (!day) { stats.missing_draft_date += 1; missing.push('date_unknown'); }
    if (at === null) { stats.missing_draft_time += 1; missing.push('time_unknown'); }
    if (missing.length) {
      stats.missing_date_or_time += 1;
      unknownFixtures.push({ fixture_id: fixture.id, sport_id: fixture.sport_id, kind: fixture.kind, reasons: missing });
    }
    if (fixture.kind === 'match' && (!fixture.team_a_id || !fixture.team_b_id)) {
      stats.unresolved_match_team_refs += 1;
      unresolvedMatchTeams.push(fixture.id);
    }
    // Historical R12A snapshot counts only 12–13 Nov off-round petanque (24 matches).
    // Venue for all sports and 16 Nov early-years fixtures were confirmed later;
    // they must not be reclassified as part of this old off-round cohort.
    if (fixture.sport_id === 'petanque' &&
        ['2026-11-12', '2026-11-13'].includes(fixture.planning_date) &&
        fixture.planning_date_confirmation === 'confirmed' &&
        fixture.planning_venue_confirmation === 'confirmed') {
      stats.confirmed_petanque_day_venue_only += 1;
    }
    const teams = fixture.kind === 'match'
      ? [fixture.team_a_id, fixture.team_b_id]
      : (Array.isArray(fixture.lanes) ? fixture.lanes : [])
          .filter(lane => !lane.vacant).map(lane => lane.school_id);
    // A team occurring on both sides of one fixture must never count as two matches.
    const schools = new Set(teams.filter(value => typeof value === 'string' && value.length));
    if (!day || at === null) continue;
    for (const schoolId of schools) {
      const key = schoolId + '\u0000' + day;
      if (!calendar.has(key)) calendar.set(key, []);
      calendar.get(key).push({
        fixture_id: fixture.id, sport_id: fixture.sport_id,
        division: fixture.division, minute: at, time: fixture.draft_time
      });
      stats.valid_school_time_entries += 1;
    }
  }
  const exact = [];
  const near = [];
  for (const [key, records] of calendar) {
    const [schoolId, date] = key.split('\u0000');
    const byTime = new Map();
    for (const rec of records) {
      if (!byTime.has(rec.minute)) byTime.set(rec.minute, []);
      byTime.get(rec.minute).push(rec);
    }
    for (const [minute, same] of byTime) {
      const fixtureIds = sortText(new Set(same.map(x => x.fixture_id)));
      if (fixtureIds.length >= 2) {
        exact.push({ school_id: schoolId, date,
          draft_start: String(Math.floor(minute / 60)).padStart(2, '0') + ':' + String(minute % 60).padStart(2, '0'),
          fixture_ids: fixtureIds });
      }
    }
    const sorted = records.sort((a, b) => a.minute - b.minute || cmp(a.fixture_id, b.fixture_id));
    for (let i = 0; i < sorted.length; i += 1) {
      for (let j = i + 1; j < sorted.length; j += 1) {
        const diff = sorted[j].minute - sorted[i].minute;
        if (diff > nearMinutes) break;
        if (diff <= 0 || sorted[i].fixture_id === sorted[j].fixture_id) continue;
        near.push({ school_id: schoolId, date,
          first_fixture_id: sorted[i].fixture_id, first_draft_start: sorted[i].time,
          second_fixture_id: sorted[j].fixture_id, second_draft_start: sorted[j].time,
          start_gap_minutes: diff });
      }
    }
  }
  exact.sort((a, b) => cmp(a.date, b.date) || cmp(a.draft_start, b.draft_start) || cmp(a.school_id, b.school_id));
  near.sort((a, b) => cmp(a.date, b.date) || cmp(a.first_draft_start, b.first_draft_start) ||
    cmp(a.school_id, b.school_id) || cmp(a.first_fixture_id, b.first_fixture_id) || cmp(a.second_fixture_id, b.second_fixture_id));
  unknownFixtures.sort((a, b) => cmp(a.fixture_id, b.fixture_id));
  stats.same_start_school_groups = exact.length;
  stats.near_start_school_pairs = near.length;
  return {
    schema_version: 1,
    report_type: 'school_level_draft_start_time_screening',
    source: {
      file: 'data/program-from-pdf-2569-20261104-draft.json',
      pdf_sha256: dataset.metadata?.source_sha256 || null,
      state: dataset.metadata?.source_status || 'unknown',
      revision: 'pdf69-20261104-draft-r11a'
    },
    interpretation: {
      approval: 'NOT_APPROVED',
      athlete_conflicts_confirmed: false,
      purpose: 'Potential school-level scheduling risks only, NOT student conflicts',
      near_minutes: nearMinutes,
      caution: 'Start times alone cannot establish match overlap, travel or recovery time. No athlete rosters, durations or athletics times are supplied.'
    },
    stats,
    school_directory: [...dataset.schools].map(s => ({ school_id: s.id, name: s.name }))
      .sort((a, b) => cmp(a.school_id, b.school_id)),
    same_start_school_groups: exact,
    near_start_school_pairs: near,
    incomplete_schedule_fixture_refs: unknownFixtures,
    unresolved_match_team_fixture_ids: sortText(unresolvedMatchTeams)
  };
}

export function renderReport(report) {
  return JSON.stringify(report, null, 2) + '\n';
}

const isMain = process.argv[1] &&
  pathToFileURL(resolve(process.argv[1])).href === import.meta.url;
if (isMain) {
  const input = JSON.parse(readFileSync(fileURLToPath(PROGRAM_URL), 'utf8'));
  const report = screenDraftProgram(input);
  const expected = renderReport(report);
  const output = fileURLToPath(REPORT_URL);
  if (process.argv.includes('--write')) {
    writeFileSync(output, expected, 'utf8');
    console.log('Wrote public, non-personal R12A risk snapshot');
  } else if (process.argv.includes('--check')) {
    const actual = readFileSync(output, 'utf8');
    if (actual !== expected) throw new Error('R12A report mismatch: regenerate and review the diff before approval');
    console.log('R12A deterministic snapshot PASS');
  } else {
    console.log(JSON.stringify(report.stats, null, 2));
  }
}