// R7: shared typography, iOS safe-area without a fixed overlay, and bottom-nav clearance.
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import vm from "node:vm";
const read=p=>readFileSync(new URL("../../"+p,import.meta.url),"utf8");
const base=read("css/base.css"),program=read("css/program.css"),results=read("css/results.css");
const programHTML=read("index.html"),resultsHTML=read("results.html");
const navigation=read("js/navigation.js"),shared=read("js/shared.js");
const programJS=read("js/program.js"),resultsJS=read("js/results.js");
const stylesheet=base+"\n"+program+"\n"+results;
const overlays=/body(?:\.is-scrolled)?::before|body::after/;
for(const [name,css] of [["base",base],["program",program],["results",results]]){
 assert.doesNotMatch(css,overlays,name+" must never paint an overlay on top of Safari page content");
}
assert.doesNotMatch(navigation,/is-scrolled|addEventListener\(["']scroll["']/,
 "navigation must not toggle an iOS scroll mask");
assert.equal((stylesheet.match(/--safe-top\s*:/g)||[]).length,1,
 "safe-area top must be declared once in shared CSS");
assert.equal((stylesheet.match(/--safe-bottom\s*:/g)||[]).length,1,
 "safe-area bottom must be declared once in shared CSS");
assert.match(base,/html\{background:#f5f7fb;scroll-padding-top:calc\(var\(--safe-top\) \+ 12px\)\}/);
assert.match(base,/body\{[^}]*padding-top:var\(--safe-top\);background:#f5f7fb\}/);
assert.match(base,/--page-title-size:clamp\(/);
assert.match(base,/--section-title-size:1\.08rem/);
assert.match(base,/h1\{[^}]*font-size:var\(--page-title-size\)/);
assert.match(base,/h2\{[^}]*font-size:var\(--section-title-size\)/);
assert.match(base,/\.panel,\.result-panel\{[^}]*padding:14px 16px;margin:12px 0/);
assert.match(base,/\.brand\{[^}]*gap:9px;padding:10px 0 7px/);
assert.match(base,/\.hero\{padding:2px 0 12px\}/);
assert.match(base,/footer\{padding:20px 0 30px;[^}]*font-size:\.75rem/);
assert.match(base,/\.shell\{padding:0 14px\}/,"both pages must use the same mobile shell gutters");
assert.match(base,/\.panel,\.result-panel\{margin:10px 0;padding:12px 14px\}/);
assert.match(base,/body > main\{padding-bottom:28px\}/);
assert.match(base,/body > footer\{padding-bottom:calc\(92px \+ var\(--safe-bottom\)\)\}/);
assert.match(base,/\.mobile-nav\{[\s\S]*?position:fixed;bottom:0/);
assert.match(base,/min-height:56px/);
assert.match(base,/@media print\{\.mobile-nav,#navigationNotice\{display:none!important\}/);
for(const [name,css] of [["program",program],["results",results]]){
 assert.doesNotMatch(css,/--safe-top:|--safe-bottom:|body\{padding-top:/,name+" must use shared safe-area");
 assert.doesNotMatch(css,/\.hero h1\{font-size:|\.panel h2\{font-size:|\.result-panel\{(?:[^}]*padding)/,
  name+" must use shared title/card typography");
 assert.doesNotMatch(css,/footer\{padding:/,name+" must not add a second footer clearance");
}
assert.match(program,/\.fields,\.cards\{grid-template-columns:1fr\}/);
assert.match(results,/\.result-tiles,\.result-controls\{grid-template-columns:1fr\}/);
for(const [name,html,cssFile] of [["program",programHTML,"program"],["results",resultsHTML,"results"]]){
 assert.ok(html.includes('href="./css/base.css"'),name+" must include typography base");
 assert.ok(new RegExp('href="\\./css/'+cssFile+'\\.css(?:\\?[^"]*)?"').test(html),name+" must include page layout");
 assert.ok(html.includes('id="mobileTabNav"'),name+" must keep R6 bottom navigation");
 assert.ok(html.includes('มิตรภาพเกมส์'));
}
new vm.Script(navigation);
new vm.Script(shared);
new vm.Script(programJS);
new vm.Script(resultsJS);
assert.match(shared,/return "ตรวจล่าสุด "/);
assert.match(programJS,/ · ไฟล์เผยแพร่บนเว็บ/);
assert.match(resultsJS,/ · ไฟล์เผยแพร่บนเว็บ/);
const schedule=JSON.parse(read("data/draft-schedule.json"));
const published=JSON.parse(read("data/public-results.json"));
assert.equal(schedule.fixtures.length,236);
assert.ok(schedule.fixtures.every(x=>x.status==="draft"));
assert.equal(published.results.length,0);
assert.equal(published.metadata.approved_only,true);
console.log("PASS R7: no header overlay; one Safe Area source; matching fonts/headers/cards/footers; bottom nav and data unchanged");
