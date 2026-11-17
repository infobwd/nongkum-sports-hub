// R49: all rankings below are synthetic; no sports result is modified or published.
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import vm from "node:vm";
const read=path=>readFileSync(new URL("../../"+path,import.meta.url),"utf8");
const raw=JSON.parse(read("data/program-from-pdf-2569-20261104-draft.json"));
const rules=JSON.parse(read("data/standings-rules.json"));
const fallback=JSON.parse(read("data/public-results.json"));
const ctx=vm.createContext({Date,URL,URLSearchParams,Intl,console});
for(const path of ["js/program-corrections.js","js/standings-rosters-r38.js","js/standings-share.js"]){
 new vm.Script(read(path),{filename:path}).runInContext(ctx);
}
const data=ctx.NongkumProgramCorrections.apply(raw);
const library=ctx.NongkumStandingsShare;
const build=r=>ctx.NongkumPreliminaryStandings.build(data,r,rules);
const footballFixture=data.fixtures.find(f=>f.id===rules.football_league.phases.league[0]);
const aFixture=data.fixtures.find(f=>f.id===rules.futsal_league.groups[0].fixture_ids[0]);
const bFixture=data.fixtures.find(f=>f.id===rules.futsal_league.groups[1].fixture_ids[0]);
assert.ok(footballFixture&&aFixture&&bFixture);
function score(f,a,b){
 return {id:"synthetic-"+f.id,fixture_id:f.id,sport_id:f.sport_id,division:f.division,
   status:"approved",result_type:"score",revision:1,team_a_id:f.team_a_id,
   team_b_id:f.team_b_id,score_a:a,score_b:b,
   winner_school_id:a===b?null:a>b?f.team_a_id:f.team_b_id};
}
const first=score(footballFixture,3,1),futsalA=score(aFixture,2,0),futsalB=score(bFixture,1,1);
const approved=[first,futsalA,futsalB];
const published=structuredClone(fallback);
published.results=approved;
published.metadata.publication_status="published";
published.metadata.approved_results_count=approved.length;
published.metadata.published_at="2026-11-17T10:40:00+07:00";
const all=build(approved),fb=all.find(g=>g.sport_id==="football"),
 fa=all.find(g=>g.division==="10 ปี ชาย A"),fbb=all.find(g=>g.division==="10 ปี ชาย B");
assert.ok(fb.provisional&&fa.provisional&&fbb.provisional);
assert.deepEqual([library.groupCode(fb),library.groupCode(fa),library.groupCode(fbb)],["f","a","b"]);
assert.ok(library.eligible(fb)&&library.eligible(fa)&&library.eligible(fbb));
const base="https://infobwd.github.io/nongkum-sports-hub/standings.html";
const options={data:published,baseHref:base,source:"live",filters:{sport:"",level:"",school:""}};
const single=library.makeParts({...options,groups:[fb],scope:"f"});
assert.equal(single.count,1);
assert.equal(single.parts.length,1);
assert.match(single.parts[0],/มิตรภาพเกมส์ 2569/);
assert.match(single.parts[0],/ฟุตบอล 12 ปี ชาย/);
assert.match(single.parts[0],/อันดับชั่วคราว/);
assert.match(single.parts[0],/ผลรับรอง 1\/15 คู่/);
assert.match(single.parts[0],/แข่ง 1 ชนะ 1 เสมอ 0 แพ้ 0/);
assert.match(single.parts[0],/3 แต้ม \| ผลต่าง \+2/);
assert.match(single.parts[0],/เกณฑ์: คะแนน → ผลต่างประตูรวม → ผลการพบกันเอง/);
assert.match(single.parts[0],/ผลรับรองในระบบเผยแพร่ล่าสุด/);
assert.match(single.parts[0],/เปิดตารางอันดับล่าสุดในแอป:/);
assert.equal(new URL(single.url).pathname,"/nongkum-sports-hub/o/");
assert.equal(new URL(single.url).searchParams.get("c"),"f");
assert.ok(single.parts[0].includes(single.url));
assert.equal((single.parts[0].match(/\| แข่ง \d+ ชนะ /g)||[]).length,6,"all six football teams remain");
const backup=library.makeParts({...options,source:"backup",groups:[fb],scope:"f"});
assert.match(backup.parts[0],/สำเนาผลรับรอง/);
const futsalShare=library.makeParts({...options,groups:[fa,fbb],scope:"x",filters:{school:"wangdong",sport:"futsal",level:"primary"}});
assert.equal(futsalShare.count,2);
assert.match(futsalShare.parts.join("\n"),/ฟุตซอล 10 ปี ชาย · สาย A/);
assert.match(futsalShare.parts.join("\n"),/ฟุตซอล 10 ปี ชาย · สาย B/);
assert.equal(library.decode(new URL(futsalShare.url).searchParams.get("c")).school,"wangdong");
const various=[{group:"f"},{group:"a"},{group:"b"},
 {group:"",school:"nongkum",sport:"football",level:"primary"},
 {group:"",school:"wangdong",sport:"futsal",level:"early"},
 {group:"",school:"",sport:"",level:""}];
for(const filter of various){
 const code=library.encode(filter);
 assert.ok(code.length<=4);
 const parsed=library.decode(code);
 assert.ok(parsed);
 if(filter.group)assert.equal(parsed.group,filter.group);
 else for(const key of ["school","sport","level"])assert.equal(parsed[key],filter[key]);
}
for(const school of data.schools){
 const code=library.encode({school:school.id});
 assert.equal(library.decode(code).school,school.id);
}
for(const invalid of ["","f1","x0000","xk00","x0z0","x009","../","%2e%2e","xbad","A","futsal"]){
 assert.equal(library.decode(invalid),null,"reject invalid short link "+invalid);
}
assert.throws(()=>library.shortUrl({sport:"athletics"},base));
assert.throws(()=>library.makeParts({...options,groups:[fb,fa],scope:"f"}));
const none=library.makeParts({...options,groups:build([]),scope:"x"});
assert.equal(none.count,0);assert.equal(none.parts.length,0);
const review=score(footballFixture,9,0);review.status="review";
assert.equal(build([review]).find(g=>g.sport_id==="football").provisional,false);
const invalidData=structuredClone(published);invalidData.results.push(review);
invalidData.metadata.approved_results_count=invalidData.results.length;
assert.throws(()=>library.makeParts({...options,data:invalidData,groups:[fb],scope:"f"}));
const long=library.makeParts({...options,groups:Array.from({length:12},()=>fb),scope:"x"});
assert.ok(long.partCount>1);
assert.equal(long.groups.length,12,"never drop a group to fit LINE message size");
assert.ok(long.parts.every(part=>part.includes("เปิดตารางอันดับล่าสุดในแอป:")));
assert.ok(long.parts.every(part=>part.includes("ฟุตบอล 12 ปี ชาย")));
assert.ok(long.parts.every(part=>part.includes("หนองกระทุ่ม")||part.includes("พุพรหม")||
 part.includes("หนองกุ่ม")));
// Verify future digest-checked final snapshot uses official position, not provisional.
const official={...fb,provisional:false,finalVerified:true,
 approved_count:fb.match_count,rows:fb.rows.map(r=>({...r,position:r.provisional_position}))};
assert.match(library.makeParts({...options,groups:[official],scope:"f"}).parts[0],/อันดับสรุปจากผลรับรอง/);
// Short routing: safe known scope, explicit school override, invalid code stays on info page.
const redirect=read("o/index.html");
const inline=redirect.match(/<script>([\s\S]*?)<\/script>/)?.[1];
assert.ok(inline);
function route(code){
 const loc=new URL("https://infobwd.github.io/nongkum-sports-hub/o/?c="+encodeURIComponent(code));
 const location={href:loc.href,search:loc.search,replaced:"",replace(url){this.replaced=url;}};
 const els={open:{href:""},linkStatus:{textContent:""}};
 const sandbox=vm.createContext({URL,URLSearchParams,location,document:{getElementById:id=>els[id]},
  NongkumStandingsShare:library,console});
 new vm.Script(inline).runInContext(sandbox);
 return {location,els,target:location.replaced?new URL(location.replaced):null};
}
const exact=route("a");
assert.equal(exact.target.pathname,"/nongkum-sports-hub/standings.html");
assert.equal(exact.target.searchParams.get("group"),"a");
assert.equal(exact.target.searchParams.get("sport"),"futsal");
assert.equal(exact.target.searchParams.get("school"),"all");
const multi=route("xtp4");
assert.equal(multi.target.searchParams.get("sport"),"futsal");
assert.equal(multi.target.searchParams.get("level"),"primary");
assert.equal(multi.target.searchParams.get("school"),"wangdong");
assert.equal(route("x999").location.replaced,"");
assert.match(route("x999").els.linkStatus.textContent,/ไม่ถูกต้อง/);
// Full UI: load synthetic R32 only; native share is one text field, clipboard fallback works.
function node(id){
 return {id,textContent:"",innerHTML:"",value:"",hidden:true,disabled:false,href:"",
   open:false,handlers:{},children:[],attributes:{},
   setAttribute(k,v){this.attributes[k]=String(v);if(k==="open")this.open=true;},
   removeAttribute(k){delete this.attributes[k];if(k==="open")this.open=false;},
   appendChild(child){this.children.push(child);},
   addEventListener(k,fn){this.handlers[k]=fn;},
   showModal(){this.open=true;},close(){this.open=false;},
   querySelectorAll(){return [...this.innerHTML.matchAll(/data-sport='([^']*)'/g)]
       .map(m=>({dataset:{sport:m[1]},addEventListener(){}}));}};
}
const ids=["standingsSchool","standingsLevel","standingsSports","standingsCount",
 "standingsStatus","standingsPublishedAt","standingsEmpty","standingsPendingRules",
 "standingsPendingDetails","standingsSkeleton","standingsFailure","standingsListing",
 "standingsRoster","refreshStandings","retryStandings","resultsSubResults",
 "emptyResultsLink","pendingResultsLink","shareStandingsAll","standingsShareDialog",
 "standingsShareClose","standingsSharePreview","standingsShareSummary",
 "standingsSharePartLabel","standingsSharePrev","standingsShareNext",
 "standingsShareNative","standingsShareCopy","standingsShareStatus"];
async function mount(results,search=""){
 const els=Object.fromEntries(ids.map(id=>[id,node(id)])),sent=[],copied=[];
 const location=new URL("https://infobwd.github.io/nongkum-sports-hub/standings.html"+search);
 const observed={replaced:""};
 const sandbox=vm.createContext({Date,URL,URLSearchParams,Intl,console:{error(){}},
   navigator:{share:async payload=>sent.push(payload),clipboard:{writeText:async text=>copied.push(text)}},
   location,history:{replaceState(_a,_b,url){observed.replaced=url;}},
   localStorage:{getItem(){return "wangdong";},setItem(){}},
   document:{visibilityState:"visible",getElementById:id=>els[id]||null,createElement:tag=>node(tag)},
   fetch:async path=>({ok:true,json:async()=>path.includes("standings-rules.json")?rules:
       path.includes("program-from-pdf")?raw:results}),setInterval(){}});
 for(const p of ["js/shared.js","js/standings-engine.js","js/program-corrections.js",
   "js/standings-rosters-r38.js","js/standings-share.js","js/standings-share-ui.js"])
   new vm.Script(read(p),{filename:p}).runInContext(sandbox);
 sandbox.NongkumNavigation={update(){}};
 new vm.Script(read("js/standings.js"),{filename:"js/standings.js"}).runInContext(sandbox);
 for(let i=0;i<80;i++)await Promise.resolve();
 return {els,sandbox,sent,copied,observed};
}
const ui=await mount(published,"?school=all");
assert.equal(ui.els.shareStandingsAll.disabled,false);
assert.match(ui.els.standingsRoster.innerHTML,/data-share-ranking='f'/);
assert.match(ui.els.standingsRoster.innerHTML,/data-share-ranking='a'/);
assert.match(ui.els.standingsRoster.innerHTML,/data-share-ranking='b'/);
ui.els.shareStandingsAll.handlers.click();
assert.equal(ui.els.standingsShareDialog.open,true);
assert.match(ui.els.standingsSharePreview.value,/ฟุตซอล/);
assert.match(ui.els.standingsSharePreview.value,/ฟุตบอล/);
assert.match(ui.els.standingsSharePreview.value,/สำเนาผลรับรอง/);
await ui.els.standingsShareNative.handlers.click();
assert.equal(ui.sent.length,1);
assert.deepEqual(Object.keys(ui.sent[0]),["text"],"do not send separate URL to LINE share");
assert.match(ui.sent[0].text,/เปิดตารางอันดับล่าสุดในแอป:/);
const button={dataset:{shareRanking:"f"}};
ui.els.standingsRoster.handlers.click({target:{closest:()=>button}});
assert.match(ui.els.standingsSharePreview.value,/ฟุตบอล 12 ปี ชาย/);
assert.doesNotMatch(ui.els.standingsSharePreview.value,/ฟุตซอล/);
await ui.els.standingsShareCopy.handlers.click();
assert.equal(ui.copied.length,1);
assert.match(ui.els.standingsShareStatus.textContent,/คัดลอกข้อความแล้ว/);
const beforeCancelled=ui.copied.length;
ui.sandbox.navigator.share=async()=>{throw {name:"AbortError"};};
await ui.els.standingsShareNative.handlers.click();
assert.equal(ui.copied.length,beforeCancelled,"cancel never silently copies");
assert.match(ui.els.standingsShareStatus.textContent,/ยกเลิกการแชร์/);
ui.sandbox.navigator.share=async()=>{throw Error("unavailable");};
await ui.els.standingsShareNative.handlers.click();
assert.equal(ui.copied.length,beforeCancelled+1,"share fallback copies complete text");
ui.els.standingsShareClose.handlers.click();
assert.equal(ui.els.standingsShareDialog.open,false);
const scoped=await mount(published,"?school=all&sport=futsal&group=a");
assert.equal(scoped.els.standingsSchool.value,"");
assert.equal(scoped.els.standingsCount.textContent.split(" ")[0],"1");
assert.match(scoped.els.standingsRoster.innerHTML,/สาย A/);
assert.doesNotMatch(scoped.els.standingsRoster.innerHTML,/สาย B/);
scoped.els.standingsSchool.value="nongkum";
scoped.els.standingsSchool.handlers.change();
assert.doesNotMatch(scoped.observed.replaced,/group=a/);
const noScores=await mount(fallback,"?sport=football");
assert.equal(noScores.els.shareStandingsAll.disabled,true);
assert.doesNotMatch(noScores.els.standingsRoster.innerHTML,/data-share-ranking/);
const html=read("standings.html"),css=read("css/standings.css");
for(const id of ids.slice(ids.indexOf("shareStandingsAll")))
 assert.ok(html.includes('id="'+id+'"'),"missing share UI: "+id);
assert.match(html,/js\/standings-share\.js\?v=r49-1/);
assert.match(html,/js\/standings-share-ui\.js\?v=r49-1/);
assert.match(html,/css\/standings\.css\?v=r49-1/);
assert.match(css,/standings-share-dialog/);
console.log("R49 PASS: football/futsal A/B, 8 schools, approved-only, exact short links, LINE text, multi-part, share/copy/cancel and mobile UI");
