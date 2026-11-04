import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import vm from "node:vm";
const file=p=>readFileSync(new URL("../../"+p,import.meta.url),"utf8");
const shared=file("js/shared.js"),program=file("js/program.js"),results=file("js/results.js");
const renderers=file("js/results-renderers.js");
const formHtml=file("forms/score-sheet.html"),formCss=file("forms/score-sheet.css"),formJs=file("forms/score-sheet.js");
const index=file("index.html"),resultsHtml=file("results.html");
for(const code of [shared,program,results,renderers,formJs])new vm.Script(code);
assert.match(index,/id="refreshProgram"/);
assert.match(resultsHtml,/id="refreshResults"/);
assert.match(index,/programRefreshStatus/);
assert.match(resultsHtml,/resultsRefreshStatus/);
assert.match(program,/data-share-fixture/);
assert.match(renderers,/data-share-result/);
assert.match(program,/score-sheet.html\?fixture/);
assert.match(program,/\?refresh=/);
assert.match(results,/\?refresh=/);
assert.match(results,/300000/);
assert.match(results,/visibilityState/);
assert.match(program,/cache:"no-store"/);
assert.match(results,/cache:"no-store"/);
assert.ok(formHtml.includes("ผู้บันทึกผล")&&formHtml.includes("กรรมการผู้ตรวจ")&&formHtml.includes("ผู้รับรองผล"));
for(const id of ["fixtureId","sportType","scoreSection","setsSection","winSection","trackSection","trackRows","winnerSection"]){
 assert.ok(formHtml.includes('id="'+id+'"'),"missing form element "+id);
}
assert.match(formCss,/@page\{size:A4 portrait/);
assert.match(formCss,/@media print/);
assert.match(formJs,/window\.print\(\)/);
assert.match(formJs,/data\/draft-schedule\.json/);
assert.ok(!formHtml.includes('type="submit"'));
assert.ok(!formJs.includes("POST"));
let copied="";
const location=new URL("https://example.org/nongkum-sports-hub/results.html");
const env=vm.createContext({
 location,URL,URLSearchParams,Intl,Date,
 navigator:{clipboard:{writeText:async v=>{copied=v;}}},
 localStorage:{getItem:()=>"",setItem:()=>{}}
});
new vm.Script(shared).runInContext(env);
const helper=env.Nongkum;
const url=helper.directItemUrl("index.html","fixture","football-id-012");
assert.equal(url,"https://example.org/nongkum-sports-hub/index.html?fixture=football-id-012");
assert.equal(await helper.shareItem("index.html","fixture","petanque 10 ปี","ข้อมูลร่าง"),"copied");
assert.equal(new URL(copied).searchParams.get("fixture"),"petanque 10 ปี");
assert.ok(helper.formatCheckedAt(new Date("2026-11-04T09:00:00Z")).includes("ตรวจล่าสุด"));
const cancelledCtx=vm.createContext({
 location,URL,URLSearchParams,Intl,Date,
 navigator:{share:async()=>{const e=new Error("cancel");e.name="AbortError";throw e;}},
 localStorage:{getItem:()=>"",setItem:()=>{}}
});
new vm.Script(shared).runInContext(cancelledCtx);
assert.equal(await cancelledCtx.Nongkum.shareItem("results.html","result","res1","result"),"cancelled");
console.log("PASS: refresh controls/static JSON, direct share clipboard fallback, A4 scorecard sections and three signatures");
