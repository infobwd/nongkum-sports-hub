// Basic source-data integrity checks. Draft-only pilot; not a certification of the PDF.
import { readFileSync } from "node:fs";

const data = JSON.parse(readFileSync(new URL("../data/draft-schedule.json", import.meta.url), "utf8"));
const errors = [];
const unique = (arr, label) => {
  const ids = arr.map((r) => r.id);
  if (new Set(ids).size !== ids.length) errors.push("duplicate " + label + " id");
};
unique(data.schools, "school");
unique(data.sports, "sport");
unique(data.fixtures, "fixture");
if (data.schools.length !== 8) errors.push("Expected 8 school entries");
if (data.sports.length !== 9) errors.push("Expected 9 navigational categories");
if (data.metadata.status !== "prototype" || data.metadata.all_data_approved !== false || data.metadata.partial_import !== true) {
  errors.push("Draft sample must not claim approved or complete data");
}
const schools = new Set(data.schools.map((s) => s.id));
const sports = new Set(data.sports.map((s) => s.id));
for (const m of data.fixtures) {
  if (!sports.has(m.sport_id)) errors.push(m.id + ": invalid sport");
  for (const key of ["team_a_id", "team_b_id"]) {
    if (m[key] && !schools.has(m[key])) errors.push(m.id + ": invalid " + key);
  }
  if (!Number.isInteger(m.source_page) || m.source_page < 1 || m.source_page > 40) {
    errors.push(m.id + ": invalid source page");
  }
  if (m.status !== "draft") errors.push(m.id + ": must be draft");
  if (m.date !== null) errors.push(m.id + ": date must be null until confirmed by organizer");
  if (m.time && !/^([01]\d|2[0-3]):[0-5]\d$/.test(m.time)) errors.push(m.id + ": invalid time");
  if (m.kind === "track_event" && (m.team_a_id || m.team_b_id)) errors.push(m.id + ": track event shown as match");
}
if (errors.length) {
  console.error(errors.join("\n"));
  process.exitCode = 1;
} else {
  console.log("PASS: draft integrity - " + data.schools.length + " schools, " + data.sports.length + " sports, " + data.fixtures.length + " sample items.");
}
