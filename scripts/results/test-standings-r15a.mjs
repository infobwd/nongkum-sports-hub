// R15-A: standalone standings UI, approved-only empty states, filter continuity and independent load.
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import vm from "node:vm";
const read=file=>readFileSync(new URL("../../"+file,import.meta.url),"utf8");
const standHtml=read("standings.html"),resultsHtml=read("results.html");
const stylesheet=read("css/standings.css"),source=read("js/standings.js");
const resultsCode=read("js/results.js"),publicData=JSON.parse(read("data/public-results.json"));
assert.equal(publicData.results.length,0,"no real results may be added during R15-A");
assert.equal(publicData.metadata.approved_only,true);
assert.equal(publicData.metadata.publication_status,"empty");
assert.match(standHtml,/data-view="standings"/);
assert.match(standHtml,/href="\.\/css\/standings\.css\?v=r15a1"/);
assert.match(standHtml,/src="\.\/js\/standings\.js\?v=r15a1"/);
assert.match(resultsHtml,/id="resultsSubStandings" href="\.\/standings\.html"/);
assert.match(standHtml,/id="resultsSubResults" href="\.\/results\.html"/);
assert.match(standHtml,/id="resultsSubStandings" href="\.\/standings\.html" aria-current="page"/);
assert.equal((standHtml.match(/class="mobile-tab-icon"/g)||[]).length,2,"still exactly 2 main mobile tabs");
assert.equal((standHtml.match(/data-nav-view=/g)||[]).length,4,"only program/results main links");
assert.match(standHtml,/id="mobileResultsLink"[^>]*aria-current="page"/);
assert.match(stylesheet,/min-height:44px/);
assert.match(stylesheet,/safe-top/);
assert.doesNotMatch(stylesheet,/::before/,"no iOS status-bar overlay");
assert.ok(!standHtml.includes("ผลสมมติ"));
assert.ok(source.includes("./data/public-results.json?refresh="));
assert.ok(!source.includes("draft-schedule.json"));
assert.ok(!source.includes("program-from-pdf"));
assert.ok(!source.includes("public-standings.json"));
assert.ok(resultsCode.includes('Nongkum.href("standings.html",state)'));
for(const file of ["js/shared.js","js/navigation.js","js/results.js","js/standings.js"])
  new vm.Script(read(file),{filename:file});

function node(id){
  return {id,textContent:"",innerHTML:"",value:"",hidden:true,disabled:false,href:"",children:[],handlers:{},
    attributes:{},setAttribute(k,v){this.attributes[k]=String(v);},
    appendChild(el){this.children.push(el);},
    addEventListener(type,cb){this.handlers[type]=cb;},
    querySelectorAll(){
      // Repeated DOM queries return the same button objects until the markup changes.
      if(this._buttonMarkup===this.innerHTML&&this._buttonCache)return this._buttonCache;
      this._buttonMarkup=this.innerHTML;
      this._buttonCache=[...this.innerHTML.matchAll(/data-sport='([^']*)'/g)].map(x=>{
        const result={dataset:{sport:x[1]},handlers:{},
          addEventListener(k,cb){this.handlers[k]=cb;},click(){this.handlers.click();}};
        return result;
      });
      return this._buttonCache;
    }
  };
}
const ids=["standingsSchool","standingsLevel","standingsSports","standingsCount","standingsStatus",
  "standingsPublishedAt","standingsEmpty","standingsPendingRules","standingsPendingDetails",
  "standingsSkeleton","standingsFailure","standingsListing","refreshStandings","retryStandings",
  "resultsSubResults","emptyResultsLink","pendingResultsLink"];
async function mount(payload,query="",fail=false){
  const els=Object.fromEntries(ids.map(id=>[id,node(id)]));
  const loc=new URL("https://example.org/nongkum-sports-hub/standings.html"+query);
  const stored=new Map(),observed={filters:[],calls:[],replaced:""};
  const context=vm.createContext({Date,URL,URLSearchParams,Intl,console:{error(){}},
    location:loc,history:{replaceState(_a,_b,href){observed.replaced=href;}},
    localStorage:{getItem:k=>stored.get(k)||"",setItem:(k,v)=>stored.set(k,v)},
    document:{visibilityState:"visible",
      getElementById:id=>els[id]||null,
      createElement:tag=>node(tag)
    },
    fetch:async (path,opt)=>{
      observed.calls.push({path,opt});
      if(fail)return {ok:false};
      return {ok:true,json:async()=>payload};
    },
    setInterval(){}});
  new vm.Script(read("js/shared.js")).runInContext(context);
  context.NongkumNavigation={update:obj=>observed.filters.push({...obj})};
  new vm.Script(source).runInContext(context);
  for(let i=0;i<20;i++)await Promise.resolve();
  return {els,observed,context};
}
const empty=await mount(publicData,"?school=wangdong&sport=football&level=primary");
assert.equal(empty.observed.calls.length,1,"standings fetches approved-only JSON exactly once");
assert.match(empty.observed.calls[0].path,/\/data\/public-results\.json\?refresh=/);
assert.equal(empty.observed.calls[0].opt.cache,"no-store");
assert.equal(empty.els.standingsEmpty.hidden,false);
assert.equal(empty.els.standingsPendingRules.hidden,true);
assert.equal(empty.els.standingsFailure.hidden,true);
assert.equal(empty.els.standingsCount.textContent,"0 ผลรับรอง");
assert.equal(empty.els.standingsSkeleton.hidden,true);
assert.equal(empty.els.standingsListing.attributes["aria-busy"],"false");
assert.match(empty.els.resultsSubResults.href,/school=wangdong/);
assert.match(empty.els.resultsSubResults.href,/sport=football/);
assert.match(empty.els.resultsSubResults.href,/level=primary/);
assert.equal(empty.observed.filters.at(-1).school,"wangdong");
assert.equal(empty.els.standingsSchool.value,"wangdong");
assert.equal(empty.els.standingsLevel.value,"primary");
empty.els.standingsSchool.value="nongkum";
empty.els.standingsSchool.handlers.change();
assert.match(empty.observed.replaced,/school=nongkum/);
assert.match(empty.els.resultsSubResults.href,/school=nongkum/);
assert.equal(empty.context.Nongkum.schoolInStore(),"nongkum");
const chips=empty.els.standingsSports.querySelectorAll("button");
assert.ok(chips.length>=9);
const petanque=chips.find(chip=>chip.dataset.sport==="petanque");
assert.ok(petanque);
petanque.click();
assert.match(empty.observed.replaced,/sport=petanque/);
assert.match(empty.els.resultsSubResults.href,/sport=petanque/);

const testOnly=structuredClone(publicData);
testOnly.results=[{id:"test-standings-only",fixture_id:"fixture-example-only",
  sport_id:"football",division:"12 ปี ชาย",status:"approved",result_type:"score",
  team_a_id:"wangdong",team_b_id:"nongkum",score_a:1,score_b:0}];
testOnly.metadata.approved_results_count=1;
testOnly.metadata.publication_status="published";
const withApproved=await mount(testOnly,"?sport=football");
assert.equal(withApproved.els.standingsEmpty.hidden,true);
assert.equal(withApproved.els.standingsPendingRules.hidden,false);
assert.match(withApproved.els.standingsPendingDetails.textContent,/1 รายการ/);
assert.equal(withApproved.els.standingsCount.textContent,"1 ผลรับรอง");
assert.ok(!withApproved.els.standingsPendingDetails.textContent.includes("อันดับ 1"),
  "no standings calculation before committee rule approval");

const invalid=structuredClone(publicData);
invalid.results=[{id:"not-approved",status:"review",result_type:"score"}];
invalid.metadata.approved_results_count=1;
invalid.metadata.publication_status="published";
const invalidView=await mount(invalid);
assert.equal(invalidView.els.standingsFailure.hidden,false,"unapproved rows must be blocked");
assert.equal(invalidView.els.standingsEmpty.hidden,true);
assert.equal(invalidView.els.standingsPendingRules.hidden,true);
const network=await mount(publicData,"",true);
assert.equal(network.els.standingsFailure.hidden,false);
assert.equal(network.els.standingsCount.textContent,"ตรวจข้อมูลไม่ได้");
assert.equal(network.els.standingsEmpty.hidden,true);
console.log("R15-A PASS: independent approved JSON, empty/error/pending states, school/sport/level handoff and only 2 mobile tabs");
