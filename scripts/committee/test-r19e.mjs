// R19-E — public draft names (explicit organizer approval) with separate school confirmation.
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import vm from "node:vm";
const read=path=>readFileSync(new URL("../../"+path,import.meta.url),"utf8");
const planning=JSON.parse(read("data/committee-roles-2569-planning.json"));
const draft=JSON.parse(read("data/committee-2569-draft-public-review.json"));
const program=JSON.parse(read("data/program-from-pdf-2569-20261104-draft.json"));
const html=read("committee.html"),js=read("js/committee.js"),css=read("css/committee.css");
const report=vm.createContext({Intl,Date,URLSearchParams});
new vm.Script(js,{filename:"committee.js"}).runInContext(report);
const api=report.NongkumCommitteeReport;
assert.ok(api.valid(planning));
assert.ok(api.validPublicDraft(draft,planning));
assert.equal(api.approvedCount(planning),0);
assert.equal(draft.entries.length,250);
assert.equal(new Set(draft.entries.map(r=>r.id)).size,250);
assert.equal(draft.entries.filter(r=>r.school_id!==null).length,209);
assert.equal(draft.entries.filter(r=>r.school_id===null).length,41);
assert.equal(draft.entries.filter(r=>r.flags.length).length,4);
assert.equal(draft.entries.filter(r=>r.sport_id==="athletics").length,58);
assert.equal(draft.entries.filter(r=>r.sport_id==="football").length,9);
assert.equal(draft.entries.filter(r=>r.sport_id==="petanque").length,13);
assert.equal(draft.entries.filter(r=>r.sport_id==="shootout").length,0);
assert.equal(draft.schools.length,8);
assert.equal(draft.sections.length,20);
assert.equal(draft.source_sha256,planning.draft_source_review.source_sha256);
assert.equal(draft.editorial_correction.corrected_entry_count,8);
assert.equal(draft.editorial_correction.corrected_pdf_sha256,planning.draft_source_review.editorial_correction.corrected_pdf_sha256);
assert.ok(draft.entries.some(r=>r.name==="นายกฤษฎา หวังดี"));
assert.ok(draft.entries.some(r=>r.name==="นายกิจรภัฏดล วงศ์แสง"));
assert.ok(!draft.entries.some(r=>r.name==="นากฤษฎา หวังดี"));
assert.equal(api.personRows(draft,{school:"wangdong"}).length,23);
assert.equal(api.personRows(draft,{school:"nongkrathum"}).length,63);
assert.equal(api.personRows(draft,{sport:"football"}).length,9);
assert.equal(api.personRows(draft,{sport:"petanque"}).length,13);
const found=draft.entries.find(r=>r.school_id==="wangdong");
assert.ok(found);
assert.ok(api.personRows(draft,{search:found.name}).some(r=>r.id===found.id));
assert.ok(api.personRows(draft,{school:"wangdong",search:found.name}).some(r=>r.id===found.id));
assert.equal(api.personRows(draft,{school:"saohong",sport:"football"}).length,
 draft.entries.filter(r=>r.school_id==="saohong"&&r.sport_id==="football").length);
assert.equal(api.validPublicDraft({...draft,entries:draft.entries.slice(1)},planning),false);
assert.equal(api.validPublicDraft({...draft,source_sha256:"0".repeat(64)},planning),false);
assert.ok(planning.sports.every(s=>s.appointment_status_2569==="not_verified"&&s.assignments_2569.length===0));
const raw=read("data/committee-2569-draft-public-review.json");
for(const word of ['"raw_text"','"teacher_id"','"person_id"','"email"','"phone"','"salt"','"iv"','"ct"','"passphrase"'])
 assert.doesNotMatch(raw,new RegExp(word));
assert.match(html,/id="committeeSchool"/);
assert.match(html,/committee-review\.html/);
assert.match(html,/ไม่ใช่คำสั่งแต่งตั้ง/);
assert.match(js,/function appendPersonNames/);
assert.match(js,/committee-person-name/);
assert.doesNotMatch(js,/innerHTML\s*=/);
assert.match(css,/committee-person-list/);
assert.equal(program.fixtures.length,237);
const encrypted=JSON.parse(read("data/committee-school-rosters-2569.encrypted.json"));
assert.equal(encrypted.schools.reduce((n,s)=>n+s.count,0),209);
assert.equal(encrypted.publication_scope,"encrypted_school_draft_only");

// Small browser-like DOM test: verify the page displays actual names and filters by school.
class Element {
 constructor(tag,id=""){this.tag=tag;this.id=id;this.children=[];this.textContent="";this.value="";this.disabled=false;this.hidden=false;this.handlers={};this.attrs={};this.dataset={};}
 appendChild(el){this.children.push(el);return el;}
 replaceChildren(){this.children=[];this.textContent="";this.value="";}
 addEventListener(k,fn){this.handlers[k]=fn;}
 setAttribute(k,v){this.attrs[k]=v;}
 querySelectorAll(s){if(this.id==="committeeViews"&&s==="[data-report-mode]")return buttons;return [];}
 get options(){return this.children.filter(x=>x.tag==="option");}
}
const ids=["committeeMain","committeeLoading","committeeLoadFailure","committeeRetry","committeeRefresh",
 "committeeReport","committeeMetrics","committeeRevision","committeeApprovalHint","committeeVenueName",
 "committeeVenueScope","committeeDraftSummary","committeeDraftMetrics","committeeDraftFootnote",
 "committeeViews","committeeSchool","committeeSport","committeeDivision","committeeSearch",
 "committeeCards","committeeCount"];
const elements=Object.fromEntries(ids.map(id=>[id,new Element("div",id)]));
const buttons=["sports","groups","schools","review"].map(x=>{const el=new Element("button");el.dataset.reportMode=x;return el;});
elements.committeeReport.hidden=true;
const context=vm.createContext({Date,Intl,URLSearchParams,
 location:{search:""},
 fetch:async(url)=>({ok:true,json:async()=>url.includes("draft-public-review")?draft:planning}),
 document:{getElementById:id=>elements[id]||null,createElement:tag=>new Element(tag)}
});
new vm.Script(js,{filename:"committee.js"}).runInContext(context);
for(let i=0;i<22;i++)await Promise.resolve();
assert.equal(elements.committeeLoadFailure.hidden,true,"render load must succeed");
assert.equal(elements.committeeReport.hidden,false);
const collect=(n)=>[n.textContent||"",...n.children.map(collect)].join(" ");
const footballName=draft.entries.find(r=>r.sport_id==="football").name;
assert.ok(collect(elements.committeeCards).includes(footballName),"football names visible in sport cards");
elements.committeeSearch.value=footballName;
elements.committeeSearch.handlers.input();
assert.ok(collect(elements.committeeCards).includes(footballName),"search by name");
elements.committeeSearch.value="";
elements.committeeSearch.handlers.input();
const schoolName=draft.entries.find(r=>r.school_id==="wangdong").name;
elements.committeeSchool.value="wangdong";
elements.committeeSchool.handlers.change();
buttons.find(b=>b.dataset.reportMode==="schools").handlers.click();
assert.ok(collect(elements.committeeCards).includes(schoolName),"school view shows own staff name");
assert.equal(elements.committeeCards.children.length,1,"school selector scopes cards");
console.log("R19-E PASS: 250 public draft entries, 8 school filters, mobile DOM rendering, school review preserved");
