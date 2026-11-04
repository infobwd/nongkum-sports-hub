import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import vm from "node:vm";

const file=p=>readFileSync(new URL("../../"+p,import.meta.url),"utf8");
const js=file("forms/score-sheet.js");
const html=file("forms/score-sheet.html");
const css=file("forms/score-sheet.css");
const data=JSON.parse(file("data/draft-schedule.json"));
new vm.Script(js);
assert.match(html,/id="blankNew"/);
assert.match(html,/id="petanqueSection"/);
assert.match(html,/id="shootoutSection"/);
assert.match(html,/id="printGuard"/);
assert.match(html,/id="fixtureId"[^>]*readonly/);
assert.match(html,/id="sportName"[^>]*readonly/);
assert.match(css,/@page\{size:A4 portrait/);
assert.match(css,/body\[data-form-state="invalid"\] \.paper\{display:none!important\}/);
assert.match(css,/\.signatures/);
assert.ok(!js.includes("POST")&&!js.includes("DriveApp")&&!js.includes("SpreadsheetApp"));

const names={
 football:"ฟุตบอล",futsal:"ฟุตซอล",shootout:"ยิงจุดโทษ",petanque:"เปตอง",
 volleyball:"วอลเลย์บอล",takraw:"เซปักตะกร้อ",tabletennis:"เทเบิลเทนนิส",
 tugofwar:"ชักเย่อ",athletics:"กรีฑา"
};
function makeElement(id){
 return {
   id,value:"",readOnly:false,disabled:false,hidden:false,handlers:{},children:[],
   textContent:"",dataset:{},
   get selectedOptions(){return [{textContent:names[this.value]||""}];},
   setAttribute(k,v){this[k]=v;},
   addEventListener(k,fn){this.handlers[k]=fn;},
   appendChild(el){this.children.push(el);},
   click(){this.handlers.click?.();}
 };
}
async function mount(fixtureId){
 const ids=[
 "fixtureId","sportType","print","blankNew","printGuard","loadNotice","sportName",
 "division","round","sourcePage","teamA","teamB","date","time","venue",
 "formNumber","winner","note","trackRows","pairSection","scoreSection",
 "petanqueSection","shootoutSection","setsSection","winSection","trackSection","winnerSection"
 ];
 const els=Object.fromEntries(ids.map(id=>[id,makeElement(id)]));
 els.sportType.value="football";
 let prints=0,htmlText="";
 const document={
  body:{dataset:{}},
  getElementById(id){if(!els[id])throw Error("Missing "+id);return els[id];},
  createElement(tag){return makeElement(tag);},
  querySelectorAll(){return ids.filter(x=>!["sportType","print","blankNew","printGuard","loadNotice","trackRows"].includes(x))
      .map(x=>els[x]).concat(els.trackRows.children.flatMap(tr=>tr.children.flatMap(td=>td.children))); }
 };
 const location=new URL("https://example.org/nongkum-sports-hub/forms/score-sheet.html"+
   (fixtureId?"?fixture="+encodeURIComponent(fixtureId):""));
 const window={print(){prints++;},handlers:{},addEventListener(k,fn){this.handlers[k]=fn;}};
 const history={replaceState(a,b,url){htmlText=url;}};
 const ctx=vm.createContext({console,Date,URLSearchParams,location,window,document,history,
  fetch:async()=>({ok:true,json:async()=>data})});
 new vm.Script(js).runInContext(ctx);
 for(let i=0;i<12;i++)await Promise.resolve();
 return {els,document,window,get prints(){return prints;},get resetUrl(){return htmlText;}};
}
const pete=data.fixtures.find(x=>x.sport_id==="petanque"&&x.kind==="match");
const football=data.fixtures.find(x=>x.sport_id==="football"&&x.kind==="match");
const track=data.fixtures.find(x=>x.kind==="track_event");
assert.ok(pete&&football&&track);

const loaded=await mount(pete.id);
assert.equal(loaded.document.body.dataset.formState,"valid");
assert.equal(loaded.els.sportType.value,"petanque");
assert.equal(loaded.els.sportType.disabled,true);
assert.equal(loaded.els.fixtureId.value,pete.id);
assert.equal(loaded.els.fixtureId.readOnly,true);
assert.equal(loaded.els.sportName.value,"เปตอง");
assert.equal(loaded.els.petanqueSection.hidden,false);
assert.equal(loaded.els.scoreSection.hidden,true);
assert.equal(loaded.els.setsSection.hidden,true);
loaded.els.print.click();
assert.equal(loaded.prints,1,"verified source allows printing");
loaded.els.sportType.value="volleyball";
loaded.els.sportType.handlers.change();
assert.equal(loaded.els.sportType.value,"petanque","linked sport must remain locked");
loaded.els.sportName.value="วอลเลย์บอล";
loaded.els.print.click();
assert.equal(loaded.prints,1,"mismatched source name must block print");
assert.equal(loaded.document.body.dataset.formState,"invalid");
assert.equal(loaded.els.printGuard.hidden,false);
loaded.els.blankNew.click();
assert.equal(loaded.document.body.dataset.formState,"blank");
assert.equal(loaded.els.fixtureId.value,"","blank reset must clear fixture ID");
assert.equal(loaded.els.sourcePage.value,"","blank reset must clear source PDF page");
assert.equal(loaded.els.teamA.value,"","blank reset must clear source team");
assert.equal(loaded.els.sportType.disabled,false);
loaded.els.sportType.value="volleyball";
loaded.els.sportType.handlers.change();
assert.equal(loaded.els.setsSection.hidden,false);
assert.equal(loaded.els.fixtureId.value,"");
loaded.els.print.click();
assert.equal(loaded.prints,2,"clean blank may print with handwritten fixture ID");

const bad=await mount("no-such-fixture");
assert.equal(bad.document.body.dataset.formState,"invalid");
assert.equal(bad.els.print.disabled,true);
bad.els.print.click();
assert.equal(bad.prints,0);
bad.els.blankNew.click();
assert.equal(bad.document.body.dataset.formState,"blank");

const foot=await mount(football.id);
assert.equal(foot.els.scoreSection.hidden,false);
assert.equal(foot.els.petanqueSection.hidden,true);
assert.equal(foot.els.division.value,football.division);
assert.equal(foot.els.fixtureId.value,football.id);
const athletics=await mount(track.id);
assert.equal(athletics.els.sportType.value,"athletics");
assert.equal(athletics.els.trackSection.hidden,false);
assert.equal(athletics.els.pairSection.hidden,true);
assert.ok(athletics.els.trackRows.children.length>=8);
const blank=await mount();
blank.els.sportType.value="shootout";
blank.els.sportType.handlers.change();
assert.equal(blank.els.shootoutSection.hidden,false);
assert.equal(blank.els.scoreSection.hidden,true);
console.log("PASS R5: locked fixture/sport, mismatched print blocked, blank reset clears source, petanque/football/athletics/shootout sheets, A4 guard");
