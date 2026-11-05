// R6/R7: native mobile bottom navigation, filter continuity and safe-area without overlays.
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import vm from "node:vm";
const file=p=>readFileSync(new URL("../../"+p,import.meta.url),"utf8");
const programPage=file("index.html"),resultsPage=file("results.html");
const baseCSS=file("css/base.css");
const shared=file("js/shared.js"),navSource=file("js/navigation.js");
const program=file("js/program.js"),results=file("js/results.js");
const renderers=file("js/results-renderers.js");
for(const [name,source] of [["shared",shared],["nav",navSource],["program",program],["results",results],["renderers",renderers]]){
  new vm.Script(source,{filename:name});
}
for(const page of [programPage,resultsPage]){
  assert.match(page,/class="mobile-nav"/,"both pages must have fixed mobile navigation");
  assert.match(page,/id="mobileProgramLink"/);
  assert.match(page,/id="mobileResultsLink"/);
  assert.match(page,/src="\.\/js\/navigation\.js(?:\?v=[^"]+)?"/);
  assert.ok(page.includes("ตารางแข่ง")&&page.includes("ผลแข่งขัน"));
  assert.ok(page.includes('id="navigationNotice"'));
  assert.ok(page.indexOf('src="./js/shared.js"')<page.indexOf('src="./js/navigation.js'));
}
assert.match(programPage,/id="mobileProgramLink"[^>]*aria-current="page"/);
assert.match(resultsPage,/id="mobileResultsLink"[^>]*aria-current="page"/);
assert.match(programPage,/data-view="program"/);
assert.match(resultsPage,/data-view="results"/);
assert.match(baseCSS,/\.mobile-nav\s*\{[^}]*display:none/);
assert.match(baseCSS,/@media\(max-width:690px\)/);
assert.match(baseCSS,/position:fixed;bottom:0/);
assert.match(baseCSS,/min-height:56px/);
assert.match(baseCSS,/safe-area-inset-bottom/);
assert.match(baseCSS,/body > main\{padding-bottom:28px\}/);
assert.match(baseCSS,/body > footer\{padding-bottom:calc\(92px/);
assert.match(baseCSS,/touch-action:manipulation/);
assert.doesNotMatch(baseCSS,/body\.is-scrolled::before/);
assert.doesNotMatch(baseCSS,/body::before/);
assert.ok(!navSource.includes('addEventListener("scroll"'),"scroll must not trigger any header mask");
assert.match(baseCSS,/@media print\{\.mobile-nav/);
assert.match(program,/NongkumNavigation\?\.update\?\.\(state\)/);
assert.match(results,/NongkumNavigation\?\.update\?\.\(state\)/);
assert.match(program,/role='img'/);
assert.match(program,/SHARE_ICON/);
assert.match(renderers,/SHARE_ICON/);

function link(id,view){
 const classes=new Set();
 return {
  id,dataset:{navView:view},href:"",handlers:{},classList:{
    add(...args){args.forEach(v=>classes.add(v));},
    remove(...args){args.forEach(v=>classes.delete(v));},
    contains(v){return classes.has(v);}
  },
  addEventListener(event,cb){this.handlers[event]=cb;}
 };
}
function boot(url,active,storedSchool=""){
 const links=[
  link("desktopProgram","program"),link("desktopResults","results"),
  link("mobileProgramLink","program"),link("mobileResultsLink","results")
 ];
 const notice={textContent:""};
 const body={dataset:{view:active},classList:{set:new Set(),toggle(key,enabled){
   if(enabled)this.set.add(key);else this.set.delete(key);
 },contains(key){return this.set.has(key);}}};
 const doc={body,getElementById(id){return id==="navigationNotice"?notice:null;},
  querySelectorAll(sel){assert.equal(sel,"[data-nav-view]");return links;}};
 const win={scrollY:0,handlers:{},scrolls:[],addEventListener(type,cb){this.handlers[type]=cb;},
  scrollTo(opts){this.scrolls.push(opts);}};
 const ctx=vm.createContext({
  document:doc,window:win,location:new URL(url),
  URL,URLSearchParams,Intl,Date,
  localStorage:{getItem(k){return k==="nongkum-school"?storedSchool:null;},setItem(){}}
 });
 new vm.Script(shared).runInContext(ctx);
 new vm.Script(navSource).runInContext(ctx);
 return {links,notice,body,window:win,ctx};
}
const home=boot("https://example.org/nongkum-sports-hub/?school=wangdong&sport=football&level=primary","program");
for(const a of home.links){
 const uri=new URL(a.href,"https://example.org/nongkum-sports-hub/");
 assert.equal(uri.searchParams.get("school"),"wangdong");
 assert.equal(uri.searchParams.get("sport"),"football");
 assert.equal(uri.searchParams.get("level"),"primary");
}
assert.ok(home.links[3].href.startsWith("./results.html?"));
home.ctx.NongkumNavigation.update({school:"saohong",sport:"petanque",level:"secondary"});
assert.match(home.links[3].href,/school=saohong/);
assert.match(home.links[3].href,/sport=petanque/);
assert.match(home.links[3].href,/level=secondary/);
// A single tap has instant visual feedback and never delays native href navigation.
home.links[3].handlers.pointerdown({button:0});
assert.equal(home.links[3].classList.contains("is-pressing"),true);
let prevented=false;
home.links[3].handlers.click({preventDefault(){prevented=true;}});
assert.equal(prevented,false,"cross-page anchor must navigate natively without waiting for fetch");
assert.equal(home.body.dataset.navTransition,"results");
assert.equal(home.links[3].classList.contains("is-activating"),true);
assert.match(home.notice.textContent,/กำลังเปิดผลการแข่งขัน/);
home.window.handlers.pageshow();
assert.equal(home.body.dataset.navTransition,undefined);
assert.equal(home.links[3].classList.contains("is-activating"),false);
// Tapping active tab should act immediately, not reload the whole page.
let samePrevented=false;
home.links[2].handlers.click({preventDefault(){samePrevented=true;}});
assert.equal(samePrevented,true);
assert.equal(home.window.scrolls.length,1);
assert.equal(home.window.scrolls[0].top,0);
// Safe Area is static CSS, and navigation never listens to scrolling.
assert.equal(home.window.handlers.scroll,undefined);
assert.equal(home.body.classList.contains("is-scrolled"),false);
// On a shared item link, old school selection must not override the target.
const direct=boot("https://example.org/nongkum-sports-hub/?fixture=football-p07-12&id=1","program","wangdong");
assert.ok(!direct.links[3].href.includes("school=wangdong"));
const fromResults=boot("https://example.org/nongkum-sports-hub/results.html?school=wangdong&sport=athletics","results");
assert.match(fromResults.links[2].href,/sport=athletics/);
fromResults.links[3].handlers.pointerdown({button:0});
fromResults.links[3].handlers.pointercancel();
assert.equal(fromResults.links[3].classList.contains("is-pressing"),false);
assert.equal(JSON.parse(file("data/draft-schedule.json")).fixtures.length,236);
assert.equal(JSON.parse(file("data/public-results.json")).results.length,0);
console.log("PASS R6/R7: visible bottom tabs, safe-area without overlay, native single-tap feedback, deep-link/filter continuity");
