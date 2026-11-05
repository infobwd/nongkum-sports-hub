// R15-E: isolated DOM behavior tests; NOT a claim of real Safari/Android/LINE device acceptance.
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import vm from "node:vm";
const read=p=>readFileSync(new URL("../../"+p,import.meta.url),"utf8");
const htmlResults=read("results.html"),htmlStandings=read("standings.html");
const jsResults=read("js/results.js"),jsStandings=read("js/standings.js");
const nav=read("js/navigation.js"),baseCss=read("css/base.css"),standCss=read("css/standings.css");
const publicData=JSON.parse(read("data/public-results.json"));
for(const [p,src] of [["results.js",jsResults],["standings.js",jsStandings],["navigation.js",nav]])
  new vm.Script(src,{filename:p});
for(const html of [htmlResults,htmlStandings]){
  assert.match(html,/viewport-fit=cover/);
  assert.match(html,/id="mobileTabNav"/);
  assert.match(html,/id="resultsSubResults"/);
  assert.match(html,/id="resultsSubStandings"/);
  assert.match(html,/aria-busy="true"/);
  assert.match(html,/loading-skeleton/);
}
for(const k of ["resultSchool","resultLevel","resultSports","refreshResults","resultsLoadFailure",
  "retryResults","sharedResult","showAllResults"])assert.ok(htmlResults.includes('id="'+k+'"'),k);
for(const k of ["standingsSchool","standingsLevel","standingsSports","refreshStandings",
  "standingsFailure","retryStandings","standingsEmpty","standingsPendingRules"])
  assert.ok(htmlStandings.includes('id="'+k+'"'),k);
assert.match(baseCss,/safe-area-inset-top/);
assert.match(baseCss,/safe-area-inset-bottom/);
assert.match(baseCss,/--mobile-nav-occupied/);
assert.match(baseCss,/\.loading-skeleton\[hidden\]/);
assert.match(standCss,/min-height:44px/);
assert.match(jsResults,/shareItem\("results\.html","result"/);
assert.match(jsResults,/data\/public-results\.json\?refresh=/);
assert.match(jsStandings,/data\/public-results\.json\?refresh=/);
assert.match(nav,/from=results#programListing/);
assert.ok(!jsStandings.includes("draft-schedule.json"));
const idsResults=["resultSchool","resultLevel","resultSports","resultsList","resultsCount",
 "noResults","publishedAt","resultsSubStandings","programLink","refreshResults",
 "resultsRefreshStatus","sharedResult","sharedResultCard","sharedResultStatus","resultsOverview",
 "showAllResults","resultsSkeleton","resultsListing","resultsLoadFailure","retryResults",
 "sharedResultLoadFailure","retrySharedResult"];
const idsStandings=["standingsSchool","standingsLevel","standingsSports","standingsCount",
 "standingsStatus","standingsPublishedAt","standingsEmpty","standingsPendingRules",
 "standingsPendingDetails","standingsSkeleton","standingsFailure","standingsListing",
 "refreshStandings","retryStandings","resultsSubResults","emptyResultsLink","pendingResultsLink"];
function el(id){
  return {id,value:"",textContent:"",innerHTML:"",hidden:true,disabled:false,href:"",
    attributes:{},handlers:{},children:[],dataset:{},
    setAttribute(k,v){this.attributes[k]=String(v);},
    addEventListener(k,f){this.handlers[k]=f;},
    appendChild(n){this.children.push(n);},
    querySelectorAll(){
      return [...this.innerHTML.matchAll(/data-sport='([^']*)'/g)].map(m=>{
        const x=el("chip");x.dataset.sport=m[1];x.click=()=>x.handlers.click();return x;
      });
    },
    querySelector(){return null;}
  };
}
async function mount(kind,payload,query="",fails=[]){
  const ids=kind==="results"?idsResults:idsStandings,els=Object.fromEntries(ids.map(k=>[k,el(k)]));
  const observed={fetches:[],nav:[],share:[],replace:[]};
  const location=new URL("https://example.test/hub/"+(kind==="results"?"results.html":"standings.html")+query);
  const calls=[{ok:true,data:payload},...fails.map(f=>({ok:!f,data:payload}))];
  const doc={
    visibilityState:"visible",
    getElementById:k=>els[k]||null,
    createElement:()=>el("option")
  };
  const nk={
    escapeHtml:v=>String(v),
    href:(page,s)=>{
      const q=new URLSearchParams();
      for(const k of ["school","sport","level"])if(s[k])q.set(k,s[k]);
      return "./"+page+(q.toString()?"?"+q:"");
    },
    saveSchool(){},schoolInStore(){return "";},
    classifyLevel(){return "primary";},
    formatCheckedAt(){return "checked";},
    shareItem:async (...a)=>{observed.share.push(a);return "copied";}
  };
  const ctx=vm.createContext({
    Date,URL,URLSearchParams,Intl,location,document:doc,
    console:{error(){}},
    history:{replaceState(_a,_b,h){observed.replace.push(h);}},
    setInterval(){},
    fetch:async (url,options)=>{
      observed.fetches.push({url,options});
      const n=calls.shift()||{ok:false};
      return {ok:n.ok,json:async()=>structuredClone(n.data)};
    },
    Nongkum:nk,NongkumNavigation:{update:x=>observed.nav.push({...x})},
    NongkumResultsRender:{card:r=>"<article>"+r.id+"</article>"}
  });
  new vm.Script(kind==="results"?jsResults:jsStandings).runInContext(ctx);
  for(let i=0;i<30;i++)await Promise.resolve();
  return {els,ctx,observed};
}
assert.equal(publicData.metadata.approved_only,true);
const empty=await mount("results",publicData,"?school=wangdong&sport=football&level=primary");
assert.equal(empty.els.noResults.hidden,false);
assert.equal(empty.els.resultsSkeleton.hidden,true);
assert.equal(empty.els.resultsListing.attributes["aria-busy"],"false");
assert.equal(empty.els.resultsLoadFailure.hidden,true);
assert.match(empty.els.resultsSubStandings.href,/school=wangdong/);
assert.match(empty.els.resultsSubStandings.href,/sport=football/);
assert.match(empty.els.resultsSubStandings.href,/level=primary/);
assert.equal(empty.observed.fetches[0].options.cache,"no-store");
empty.els.resultSchool.value="nongkum";
empty.els.resultSchool.handlers.change();
assert.match(empty.observed.replace.at(-1),/school=nongkum/);
const filtered=await mount("standings",publicData,"?school=wangdong&sport=football&level=primary");
assert.equal(filtered.els.standingsEmpty.hidden,false);
assert.equal(filtered.els.standingsPendingRules.hidden,true);
assert.equal(filtered.els.standingsSkeleton.hidden,true);
assert.match(filtered.els.resultsSubResults.href,/school=wangdong/);
assert.match(filtered.els.resultsSubResults.href,/level=primary/);
// Always isolated synthetic payload, never writes to data/public-results.json.
const testOnly=structuredClone(publicData);
testOnly.results=[{id:"TEST-RESULT-UI-1",fixture_id:"TEST-MATCH-UI-1",sport_id:"football",
  division:"รุ่นจำลอง",team_a_id:"wangdong",team_b_id:"nongkum",
  result_type:"score",score_a:1,score_b:0,winner_school_id:"wangdong",status:"approved"}];
testOnly.metadata.approved_results_count=1;
testOnly.metadata.publication_status="published";
const pending=await mount("standings",testOnly,"?sport=football");
assert.equal(pending.els.standingsEmpty.hidden,true);
assert.equal(pending.els.standingsPendingRules.hidden,false);
assert.equal(pending.els.standingsCount.textContent,"1 ผลรับรอง");
const direct=await mount("results",testOnly,"?result=TEST-RESULT-UI-1");
assert.equal(direct.els.sharedResult.hidden,false);
assert.equal(direct.els.resultsOverview.hidden,true);
assert.match(direct.els.sharedResultCard.innerHTML,/TEST-RESULT-UI-1/);
const notFound=await mount("results",publicData,"?result=TEST-NEVER-PUBLISHED");
assert.match(notFound.els.sharedResultCard.innerHTML,/ยังไม่มีผลการแข่งขันที่ผ่านการรับรอง/);
notFound.els.showAllResults.handlers.click();
assert.equal(notFound.els.resultsOverview.hidden,false);
// Revalidate refresh errors: preserve previous good payload in UI.
const retry=await mount("results",testOnly,"",[true]);
assert.match(retry.els.resultsList.innerHTML,/TEST-RESULT-UI-1/);
retry.els.refreshResults.handlers.click();
for(let i=0;i<30;i++)await Promise.resolve();
assert.match(retry.els.resultsList.innerHTML,/TEST-RESULT-UI-1/);
assert.match(retry.els.resultsRefreshStatus.textContent,/รีเฟรชไม่สำเร็จ/);
assert.equal(retry.els.resultsLoadFailure.hidden,true);
const offline=await mount("standings",publicData,"",[true]);
offline.els.refreshStandings.handlers.click();
for(let i=0;i<30;i++)await Promise.resolve();
assert.equal(offline.els.standingsEmpty.hidden,false);
assert.match(offline.els.standingsStatus.textContent,/รีเฟรชไม่สำเร็จ/);
const firstFail=await mount("standings",publicData,"",[true]);
firstFail.els.refreshStandings.handlers.click();
for(let i=0;i<10;i++)await Promise.resolve();
assert.equal(firstFail.els.standingsEmpty.hidden,false);
// A newly opened page with offline fetch must show error rather than pretend "no approved results".
const initialDown=await mount("results",publicData,"",[]);
// Test a corrupted payload gets blocked; a score with unapproved status is not public.
const bad=structuredClone(testOnly);bad.results[0].status="review";
const blocked=await mount("results",bad);
assert.equal(blocked.els.resultsLoadFailure.hidden,false);
assert.equal(blocked.els.noResults.hidden,true);
console.log("R15-E PASS: DOM filters, deep links, two-view navigation, approved gate, skeleton, refresh retention and mobile safe-area contracts (device QA pending)");
