// R8: shared matches open immediately (including LINE's in-app browser),
// short static preview pages match the real 236 fixtures, and results remain approved-only.
import assert from "node:assert/strict";
import {readFileSync,existsSync} from "node:fs";
import vm from "node:vm";
const read=p=>readFileSync(new URL("../../"+p,import.meta.url),"utf8");
const source=JSON.parse(read("data/draft-schedule.json"));
const approvedPublic=JSON.parse(read("data/public-results.json"));
const index=JSON.parse(read("data/share-index.json"));
const shared=read("js/shared.js");
const sorter=read("js/schedule-order.js");
const corrections=read("js/program-corrections.js");
const program=read("js/program.js");
const results=read("js/results.js");
const renderers=read("js/results-renderers.js");
const programHtml=read("index.html"),resultHtml=read("results.html");
const webRoot="https://infobwd.github.io/nongkum-sports-hub/";
for(const code of [shared,sorter,program,results,renderers])new vm.Script(code);
assert.equal(index.count,236);
assert.equal(source.fixtures.length,236);
assert.equal(Object.keys(index.links).length,236);
assert.equal(new Set(Object.values(index.links)).size,236);
assert.equal(approvedPublic.results.length,0);
assert.equal(approvedPublic.metadata.approved_only,true);
assert.ok(programHtml.indexOf('id="sharedFixture"')<programHtml.indexOf('id="programOverview"'));
assert.match(resultHtml,/id="sharedResult"/);
assert.match(programHtml,/id="showFullSchedule"/);
assert.match(resultHtml,/id="showAllResults"/);
const names=source.schools.map(s=>s.short);
assert.ok(names.includes("วังด้ง"));
let copied="",sharedPayload=null;
const loc=new URL(webRoot+"index.html");
const helperCtx=vm.createContext({location:loc,URL,URLSearchParams,Intl,Date,Math,
 navigator:{
  share:async data=>{sharedPayload=data;},
  clipboard:{writeText:async value=>{copied=value;}}
 },
 localStorage:{getItem:()=>null,setItem:()=>{}}
});
new vm.Script(shared).runInContext(helperCtx);
const helper=helperCtx.Nongkum;
for(const fixture of source.fixtures){
 const slug=helper.fixtureShareCode(fixture.id);
 assert.match(slug,/^f[0-9a-f]{8}$/);
 assert.equal(index.links[slug],fixture.id);
 const file="m/"+slug+"/index.html";
 assert.ok(existsSync(new URL("../../"+file,import.meta.url)),"Missing static preview "+file);
 const html=read(file);
 assert.ok(html.includes('property="og:title"')&&html.includes('property="og:description"'));
 assert.ok(html.includes('property="og:url"'));
 assert.ok(html.includes('content="'+webRoot+"m/"+slug+'/'));
 assert.ok(html.includes("ข้อมูลร่าง"),"Never imply results are official");
 assert.ok(html.includes("index.html?fixture="));
 assert.ok(html.includes('data-fixture-id='));
}
const example=source.fixtures.find(x=>x.id==="football-p07-12-ปี-ชาย-009");
assert.ok(example);
const short=helper.fixtureShareUrl(example.id);
assert.equal(short,webRoot+"m/"+helper.fixtureShareCode(example.id)+"/");
const page=read("m/"+helper.fixtureShareCode(example.id)+"/index.html");
assert.ok(page.includes("หนองกระทุ่ม")&&page.includes("วังด้ง"));
assert.ok(page.includes("12 ปี ชาย"));
assert.equal(await helper.shareFixture(example,"ฟุตบอล","หนองกระทุ่ม","วังด้ง"),"shared");
assert.equal(sharedPayload.url,short);
assert.match(sharedPayload.text,/หนองกระทุ่ม พบ วังด้ง/);
assert.match(sharedPayload.text,/ข้อมูลร่าง/);
const fallbackCtx=vm.createContext({location:loc,URL,URLSearchParams,Intl,Date,Math,
 navigator:{clipboard:{writeText:async value=>{copied=value;}}},
 localStorage:{getItem:()=>null,setItem:()=>{}}
});
new vm.Script(shared).runInContext(fallbackCtx);
assert.equal(await fallbackCtx.Nongkum.shareFixture(example,"ฟุตบอล","หนองกระทุ่ม","วังด้ง"),"copied");
assert.equal(copied,short);
const old=fallbackCtx.Nongkum.directItemUrl("index.html","fixture",example.id);
assert.equal(new URL(old).searchParams.get("fixture"),example.id);

function makeElement(id){
 return {id,innerHTML:"",textContent:"",value:"",hidden:false,open:false,children:[],handlers:{},
  appendChild(v){this.children.push(v);},
  addEventListener(ev,fn){this.handlers[ev]=fn;},
  querySelector(sel){return sel==="details.source-details"?{open:false}:null;},
  querySelectorAll(selector){
   if(selector!=="button")return [];
   const attr=id==="sports"?"sport":id==="levels"?"level":"sport";
   return [...this.innerHTML.matchAll(new RegExp("data-"+attr+"='([^']*)'","g"))].map(v=>{
    const b={dataset:{[attr]:v[1]},handlers:{},addEventListener(type,fn){this.handlers[type]=fn;},click(){this.handlers.click();}};
    return b;
   });
  }
 };
}
async function mountProgram(query,stored=""){
 const ids=["school","search","sports","levels","cards","count","empty","more",
   "advancedFilters","activeFiltersHint","resultsLink","refreshProgram","programRefreshStatus",
   "sharedFixture","sharedFixtureCard","sharedFixtureStatus","programOverview","showFullSchedule"];
 const els=Object.fromEntries(ids.map(id=>[id,makeElement(id)]));
 const location=new URL(webRoot+"index.html"+query);
 const history={latest:"",replaceState(_a,_b,href){this.latest=href;}};
 const context=vm.createContext({
  console,Date,URL,URLSearchParams,Intl,Math,location,history,
  window:{scrollTo(){}},
  document:{getElementById(id){return els[id]||null;},createElement(tag){return makeElement(tag);}},
  localStorage:{getItem:()=>stored,setItem(){}},
  fetch:async()=>({ok:true,json:async()=>source})
 });
 new vm.Script(shared).runInContext(context);
 new vm.Script(sorter).runInContext(context);
 new vm.Script(corrections).runInContext(context);
 new vm.Script(program).runInContext(context);
 for(let i=0;i<18;i++)await Promise.resolve();
 return {els,history,context};
}
const direct=await mountProgram("?fixture="+encodeURIComponent(example.id),"saohong");
assert.equal(direct.els.sharedFixture.hidden,false);
assert.equal(direct.els.programOverview.hidden,true);
assert.ok(direct.els.sharedFixtureCard.innerHTML.includes("หนองกระทุ่ม"));
assert.ok(direct.els.sharedFixtureCard.innerHTML.includes("วังด้ง"));
assert.ok(direct.els.sharedFixtureCard.innerHTML.includes("รายละเอียดการแข่งขัน"));
assert.equal(direct.els.cards.innerHTML,"","no long list before shared match");
const later=source.fixtures[source.fixtures.length-2];
const laterDirect=await mountProgram("?fixture="+encodeURIComponent(later.id));
assert.ok(laterDirect.els.sharedFixtureCard.innerHTML.includes(later.id),"fixtures past first 12 must work");
const bad=await mountProgram("?fixture=nonexistent-match-foobar");
assert.match(bad.els.sharedFixtureCard.innerHTML,/ไม่พบคู่แข่งขันที่แชร์มา/);
assert.equal(bad.els.programOverview.hidden,true,"invalid link must not silently show main page");
direct.els.showFullSchedule.handlers.click();
assert.equal(direct.els.sharedFixture.hidden,true);
assert.equal(direct.els.programOverview.hidden,false);
assert.ok(direct.els.cards.innerHTML.includes("schedule-day"));
assert.ok(!direct.history.latest.includes("fixture="));

async function mountResults(payload,query){
 const ids=["resultSchool","resultLevel","resultSports","resultsList","resultsCount",
   "noResults","publishedAt","programLink","refreshResults","resultsRefreshStatus",
   "sharedResult","sharedResultCard","sharedResultStatus","resultsOverview","showAllResults"];
 const els=Object.fromEntries(ids.map(id=>[id,makeElement(id)]));
 const location=new URL(webRoot+"results.html"+query);
 const ctx=vm.createContext({
  console,Date,URL,URLSearchParams,Intl,Math,location,history:{replaceState(){}},
  document:{getElementById(id){return els[id]||null;},createElement(tag){return makeElement(tag);}},
  localStorage:{getItem:()=>"wangdong",setItem(){}},
  fetch:async()=>({ok:true,json:async()=>payload})
 });
 for(const content of [shared,renderers,results])new vm.Script(content).runInContext(ctx);
 for(let i=0;i<18;i++)await Promise.resolve();
 return els;
}
const none=await mountResults(approvedPublic,"?result=unapproved-id");
assert.equal(none.sharedResult.hidden,false);
assert.equal(none.resultsOverview.hidden,true);
assert.match(none.sharedResultCard.innerHTML,/ยังไม่มีผลการแข่งขันที่ผ่านการรับรอง/);
const synthetic={...approvedPublic,metadata:{...approvedPublic.metadata,
 publication_status:"published",approved_results_count:1},
 results:[{id:"approved-example",status:"approved",sport_id:"football",
 fixture_id:example.id,division:"12 ปี ชาย",result_type:"score",
 team_a_id:source.schools[0].id,team_b_id:source.schools[1].id,
 score_a:2,score_b:1,winner_school_id:source.schools[0].id}]};
const accepted=await mountResults(synthetic,"?result=approved-example");
assert.ok(accepted.sharedResultCard.innerHTML.includes("result-score"));
assert.equal(accepted.resultsOverview.hidden,true);
assert.match(accepted.sharedResultStatus.textContent,/ผลรับรองแล้ว/);
console.log("PASS R8: 236 unique LINE static previews, ASCII short links, legacy deep-link first screen, invalid/late IDs, approved-only results");
