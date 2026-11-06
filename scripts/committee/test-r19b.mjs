// R19-B: public aggregates only; the 2569 draft personal roster is private.
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=p=>readFileSync(new URL("../../"+p,import.meta.url),"utf8");
const raw=read("data/committee-roles-2569-planning.json"),d=JSON.parse(raw);
const r=d.draft_source_review;
assert.equal(r.source_type,"draft_pdf_not_schema_v3_schedule_json");
assert.equal(r.publication_scope,"aggregate_only_no_names");
assert.equal(r.year_be,2569);
assert.equal(r.person_role_rows_observed,250);
assert.equal(r.normalized_distinct_name_strings_observed,151);
assert.equal(r.name_strings_with_multiple_role_rows,55);
assert.equal(r.nonperson_group_or_unfilled_rows,10);
assert.equal(r.rows_needing_text_review,6);
assert.equal(Object.keys(r.by_committee_section).length,20);
assert.equal(Object.values(r.by_committee_section).reduce((a,b)=>a+b,0),250);
assert.equal(r.by_sport.athletics,58);
assert.equal(r.by_sport.shootout,0);
assert.ok(d.sports.length===9&&d.sports.every(s=>s.assignments_2569.length===0&&
 s.appointment_status_2569==="not_verified"&&s.draft_2569_named_role_rows_observed===r.by_sport[s.sport_id]));
for(const re of [/"name_as_printed"/,/"person_id"/,/"teacher_id"\s*:/,/"raw_text"\s*:/,/"email"\s*:/])assert.doesNotMatch(raw,re);
assert.match(read("committee.html"),/id="committeeDraftSummary"/);
assert.match(read("js/committee.js"),/function renderDraftSummary/);
assert.match(read("css/committee.css"),/\.committee-draft-summary/);
assert.doesNotMatch(read("js/committee.js"),/innerHTML\s*=/);
console.log("R19-B PASS: 250 draft rows, 151 name strings, 20 groups, privacy gate");
