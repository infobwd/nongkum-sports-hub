// R12C: local-only roster analysis; never print private athlete identifiers or names.
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const validDate = (s) => {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(s + 'T00:00:00Z');
  return !Number.isNaN(d.valueOf()) && d.toISOString().slice(0, 10) === s;
};
const minutes = (s) => typeof s === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(s)
  ? Number(s.slice(0, 2)) * 60 + Number(s.slice(3)) : null;
const nonnegative = (n) => Number.isInteger(n) && n >= 0;
const readyEvidence = (status, synthetic) => status === 'organizer_confirmed' ||
  (synthetic === true && status === 'synthetic');
const cmp = (a, b) => a < b ? -1 : a > b ? 1 : 0;

function interval(t, synthetic) {
  if (!t || !validDate(t.date) || minutes(t.start) === null ||
      !Number.isInteger(t.duration_minutes) || t.duration_minutes <= 0 ||
      !nonnegative(t.check_in_lead_minutes) || !nonnegative(t.delay_buffer_minutes) ||
      typeof t.venue_id !== 'string' || !t.venue_id) return null;
  const start = Date.parse(t.date + 'T00:00:00Z') / 60000 + minutes(t.start);
  return { checkin: start - t.check_in_lead_minutes, start,
    end: start + t.duration_minutes, venue: t.venue_id,
    buffer: t.delay_buffer_minutes,
    verified: readyEvidence(t.evidence_status, synthetic) && !!t.source_revision };
}

function uniqueById(entries, kind) {
  const m = new Map();
  for (const entry of entries) {
    if (!entry || typeof entry.id !== 'string' || !entry.id || m.has(entry.id)) {
      throw new Error('Invalid or duplicate ' + kind + ' id');
    }
    m.set(entry.id, entry);
  }
  return m;
}

function travelFor(a, b, journeys, synthetic) {
  if (a === b) return { minutes: 0, verified: true };
  const j = journeys.find(x => x.from_venue_id === a && x.to_venue_id === b);
  if (!j || !nonnegative(j.minutes)) return null;
  return { minutes: j.minutes, verified: readyEvidence(j.evidence_status, synthetic) &&
    !!j.source_revision };
}

function classifyPair(a, b, schedule, journeys, policy, synthetic) {
  const x = interval(schedule.get(a.fixture_id), synthetic);
  const y = interval(schedule.get(b.fixture_id), synthetic);
  if (!x || !y) return { status: 'unknown', reasons: ['time_or_venue_incomplete'] };
  const first = x.checkin <= y.checkin ? x : y;
  const second = first === x ? y : x;
  const uncertain = a.conditional || b.conditional || a.role === 'substitute' ||
    b.role === 'substitute' || !first.verified || !second.verified;
  let derived;
  if (first.end > second.checkin && second.end > first.checkin) {
    derived = { status: 'hard_conflict', reasons: ['checkin_or_competition_overlap'] };
  } else {
    const journey = travelFor(first.venue, second.venue, journeys, synthetic);
    if (!journey || !nonnegative(policy.minimum_rest_minutes)) {
      return { status: 'unknown', reasons: ['travel_or_rest_rule_unknown'] };
    }
    if (first.end > second.checkin || first.end + journey.minutes > second.checkin) {
      derived = { status: 'hard_conflict', reasons: ['insufficient_transition_time'] };
    } else if (first.end + journey.minutes + policy.minimum_rest_minutes +
               first.buffer > second.checkin) {
      derived = { status: 'near_conflict', reasons: ['rest_or_delay_buffer_short'] };
    } else {
      derived = { status: 'checked_no_conflict', reasons: [] };
    }
    if (!journey.verified) return { status: 'potential_conflict',
      reasons: ['travel_estimate_unconfirmed'], modelled_status: derived.status };
  }
  if (!readyEvidence(policy.evidence_status, synthetic) || !policy.source_revision) {
    return { status: 'potential_conflict',
      reasons: ['rest_policy_unconfirmed'], modelled_status: derived.status };
  }
  if (uncertain) return { status: 'potential_conflict',
    reasons: [a.conditional || b.conditional ? 'conditional_round' :
      a.role === 'substitute' || b.role === 'substitute' ? 'substitute_possible_callup' :
      'schedule_not_confirmed'], modelled_status: derived.status };
  return derived;
}

/**
 * Inputs contain ONLY verified private IDs (no names necessary); never serialize result.details
 * to public files, pull requests or CI logs. All program times require separate timing evidence.
 */
export function analyzeRosterConflicts(program, roster, config) {
  if (!program || !Array.isArray(program.fixtures) || !Array.isArray(program.schools) ||
      !roster || !Array.isArray(roster.athletes) || !Array.isArray(roster.teams) ||
      !Array.isArray(roster.school_coverage) || !config || !Array.isArray(config.timings) ||
      !Array.isArray(config.travel) || !config.policy) {
    throw new TypeError('R12C requires program, roster/coverage, and explicit timing config');
  }
  if (roster.schema_version !== 'r12-private-roster-v1') throw new Error('Unknown roster contract');
  const synthetic = roster.synthetic === true && config.synthetic === true;
  if (roster.synthetic !== config.synthetic) throw new Error('Synthetic/production mode mismatch');
  const fixtures = uniqueById(program.fixtures, 'fixture');
  const teams = uniqueById(roster.teams.map(x => ({ ...x, id: x.team_ref })), 'team');
  const athleteIds = new Set();
  const timings = new Map();
  for (const t of config.timings) {
    if (!t || !fixtures.has(t.fixture_id) || timings.has(t.fixture_id)) {
      throw new Error('Unknown or duplicate timing fixture_id');
    }
    timings.set(t.fixture_id, t);
  }
  const knownSchools = new Set(program.schools.map(s => s.id));
  const coverage = new Map();
  for (const c of roster.school_coverage) {
    if (!knownSchools.has(c.school_id) || coverage.has(c.school_id)) {
      throw new Error('Duplicate/unknown coverage school');
    }
    coverage.set(c.school_id, c);
  }
  const coverageComplete = [...knownSchools].every(id => {
    const c = coverage.get(id);
    return c?.status === 'accepted_for_analysis' &&
      nonnegative(c.expected_pages) && c.expected_pages > 0 &&
      c.received_pages === c.expected_pages && c.rows_verified === true;
  });
  const laneMappings = roster.lane_assignments || [];
  const details = [];
  const unresolved = [];
  const registrationCounts = { player: 0, substitute: 0, relay_member: 0 };
  for (const athlete of roster.athletes) {
    if (!athlete || typeof athlete.athlete_id !== 'string' || !athlete.athlete_id ||
        athleteIds.has(athlete.athlete_id) || !knownSchools.has(athlete.school_id)) {
      throw new Error('Invalid/duplicate athlete ID or school');
    }
    athleteIds.add(athlete.athlete_id);
    const registrations = Array.isArray(athlete.registrations) ? athlete.registrations : [];
    if (!athlete.identity_verified || athlete.extraction_status !== 'accepted_for_analysis' ||
        !registrations.length) {
      unresolved.push({ athlete_id: athlete.athlete_id, reason: 'identity_or_roster_not_accepted' });
      continue;
    }
    const events = new Map();
    for (const reg of registrations) {
      if (!['player', 'substitute', 'relay_member'].includes(reg.role)) {
        unresolved.push({ athlete_id: athlete.athlete_id, reason: 'unverified_role' }); continue;
      }
      registrationCounts[reg.role] += 1;
      let refs = [];
      if (reg.team_ref) {
        const team = teams.get(reg.team_ref);
        if (!team || team.school_id !== athlete.school_id || team.sport_id !== reg.sport_id ||
            team.division !== reg.division || team.review_status !== 'accepted_for_analysis') {
          unresolved.push({ athlete_id: athlete.athlete_id, reason: 'team_mapping_unverified' }); continue;
        }
        refs = [...fixtures.values()].filter(f => f.kind === 'match' &&
          f.sport_id === team.sport_id && f.division === team.division &&
          (f.team_a_id === team.source_team_id || f.team_b_id === team.source_team_id))
          .map(f => ({ fixture_id: f.id, conditional: false }));
        for (const id of team.possible_fixture_ids || []) {
          const f = fixtures.get(id);
          if (!f || f.kind !== 'match' || f.sport_id !== team.sport_id ||
              f.division !== team.division || (f.team_a_id && f.team_a_id !== team.source_team_id) &&
              (f.team_b_id && f.team_b_id !== team.source_team_id)) {
            unresolved.push({ athlete_id: athlete.athlete_id, reason: 'conditional_fixture_unverified' });
          } else refs.push({ fixture_id: id, conditional: true });
        }
      } else if (reg.event_id) {
        const f = fixtures.get(reg.event_id);
        const lane = f?.kind === 'track_event' && f.lanes?.find(l => l.lane === reg.lane && !l.vacant);
        const mapped = lane?.school_id === athlete.school_id ||
          laneMappings.some(x => x.fixture_id === reg.event_id && x.lane === reg.lane &&
            x.school_id === athlete.school_id && x.review_status === 'accepted_for_analysis');
        if (!f || f.sport_id !== reg.sport_id || !lane || !mapped ||
            reg.role === 'substitute' && !reg.substitute_eligible) {
          unresolved.push({ athlete_id: athlete.athlete_id, reason: 'athletics_lane_unverified' }); continue;
        }
        refs = [{ fixture_id: f.id, conditional: false }];
      } else {
        unresolved.push({ athlete_id: athlete.athlete_id, reason: 'registration_link_missing' });
        continue;
      }
      if (!refs.length) {
        unresolved.push({ athlete_id: athlete.athlete_id, reason: 'no_fixture_mapping' }); continue;
      }
      for (const ref of refs) {
        const previous = events.get(ref.fixture_id);
        events.set(ref.fixture_id, { fixture_id: ref.fixture_id,
          conditional: !!ref.conditional && (previous ? previous.conditional : true),
          role: previous?.role === 'player' || reg.role === 'player' || reg.role === 'relay_member' ?
            'player' : 'substitute' });
      }
    }
    const candidates = [...events.values()].sort((a, b) => cmp(a.fixture_id, b.fixture_id));
    for (let i = 0; i < candidates.length; i += 1) {
      for (let j = i + 1; j < candidates.length; j += 1) {
        const a = candidates[i]; const b = candidates[j];
        const result = classifyPair(a, b, timings, config.travel, config.policy, synthetic);
        details.push({ athlete_id: athlete.athlete_id, school_id: athlete.school_id,
          fixture_ids: [a.fixture_id, b.fixture_id], ...result });
      }
    }
  }
  const statuses = ['hard_conflict', 'near_conflict', 'potential_conflict',
    'unknown', 'checked_no_conflict'];
  const counts = Object.fromEntries(statuses.map(s => [s, details.filter(d => d.status === s).length]));
  counts.unknown += unresolved.length;
  const completeEvidence = [...fixtures.keys()].every(id => !!interval(timings.get(id), synthetic));
  const fullyAssessed = coverageComplete && unresolved.length === 0 && completeEvidence &&
    counts.unknown === 0 && counts.potential_conflict === 0;
  const public_summary = {
    schema_version: 1, report_type: 'r12c_aggregate_no_personal_data',
    source_approval: synthetic ? 'SYNTHETIC_TEST_ONLY' : 'REQUIRES_ORGANIZER_VERIFICATION',
    schools_expected: knownSchools.size,
    schools_accepted: [...coverage.values()].filter(c =>
      c.status === 'accepted_for_analysis' && c.rows_verified === true &&
      c.expected_pages > 0 && c.received_pages === c.expected_pages).length,
    athletes_processed: roster.athletes.length,
    registrations_processed: Object.values(registrationCounts).reduce((a, b) => a + b, 0),
    pair_evaluations: details.length,
    counts,
    unresolved_registration_checks: unresolved.length,
    full_program_time_coverage: completeEvidence,
    coverage_complete: coverageComplete,
    ready_to_claim_no_conflict: fullyAssessed && counts.hard_conflict === 0 &&
      counts.near_conflict === 0,
    warning: 'Aggregate screening only; never infer individual clearance from missing roster/time or conditional rounds.'
  };
  return { public_summary, details, unresolved }; // details and unresolved are PRIVATE ONLY
}

export function publicSummary(report) {
  return JSON.stringify(report.public_summary, null, 2) + '\n';
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  const args = process.argv.slice(2);
  const option = (k) => { const idx = args.indexOf(k); return idx >= 0 ? args[idx + 1] : undefined; };
  if (!option('--program') || !option('--roster') || !option('--config') ||
      args.some(a => !['--program', '--roster', '--config', '--public-summary'].includes(a) &&
        ![option('--program'), option('--roster'), option('--config'), option('--public-summary')].includes(a))) {
    process.stderr.write('Usage: node analyze-roster-conflicts.mjs --program PATH --roster PRIVATE_PATH --config PATH [--public-summary PATH]\n');
    process.exitCode = 2;
  } else {
    try {
      const load = (p) => JSON.parse(readFileSync(resolve(p), 'utf8'));
      const summary = publicSummary(analyzeRosterConflicts(
        load(option('--program')), load(option('--roster')), load(option('--config'))));
      if (option('--public-summary')) writeFileSync(resolve(option('--public-summary')), summary, 'utf8');
      else process.stdout.write(summary);
    } catch {
      // Intentionally do not log exceptions: input paths/errors can contain student data.
      process.stderr.write('R12C validation failed; review input privately (no data printed).\n');
      process.exitCode = 1;
    }
  }
}
