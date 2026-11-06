// R19-J: verify unique physical name+clause highlighting, safe overlay, mobile controls.
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import vm from "node:vm";
const read=path=>readFileSync(new URL("../../"+path,import.meta.url),"utf8");
const helper=read("js/committee-pdf-highlight.js");
const reader=read("js/pdf-viewer.js");
const committee=read("js/committee.js");
const bridge=read("js/committee-pdf-preview.js");
const html=read("committee-pdf-viewer.html");
const css=read("css/committee-pdf-viewer.css");
const roster=JSON.parse(read("data/committee-2569-draft-public-review.json"));
const entry=roster.entries.find(x=>x.number==="14.2.4"&&x.pdf_page===11);
assert.ok(entry,"known source clause must be present");
assert.equal(entry.name,"นายวีรภัทร ศรีนวล");
assert.match(html,/id="pdfHighlightLayer"/);
assert.match(html,/id="pdfMatchStatus"/);
assert.match(html,/js\/committee-pdf-highlight\.js\?v=r19j1/);
assert.match(html,/js\/pdf-viewer\.js\?v=r19j1/);
assert.match(html,/min="1" max="64"/);
assert.match(html,/ตั้งค่าการอ่าน PDF/);
assert.match(css,/committee-pdf-name-highlight/);
assert.match(css,/min-height:44px/);
assert.match(committee,/NongkumCommitteePdf\?\.open\(Number\(row\.pdf_page\),row\)/);
assert.match(bridge,/url\.searchParams\.set\("number", reference\.number\)/);
assert.match(bridge,/url\.searchParams\.set\("name", reference\.name\)/);
assert.match(reader,/const EXPECTED_PAGES = 41/);
assert.match(reader,/pageNumber === selectedCommitteePage/);
assert.match(reader,/page\.getTextContent\(\)/);
assert.match(reader,/requestId !== generation/);
assert.match(reader,/let mark = null;/);
assert.doesNotMatch(reader,/searchParams\.get\("file"\)/);
new vm.Script(helper,{filename:"committee-pdf-highlight.js"});
new vm.Script(reader,{filename:"pdf-viewer.js"});
const window={};
new vm.Script(helper).runInNewContext({window});
const api=window.NongkumCommitteeHighlight;
function item(str,x,y,w=130,h=11){
  return {str,transform:[h,0,0,h,x,y],width:w,height:h};
}
const items=[
  item("12.4 นายวีรภัทร  ศรีนวล",63,770),
  item("14.2.2 นายรัฐเขต  ขัดบง",135,90),
  item("14.2.3 ว่าที่ร้อยตรีเสกศิลป์ รัตนา",135,70),
  item("14.2.4 นายวีรภัทร  ศรีนวล",135,50)
];
const chosen=api.findLine(items,{number:entry.number,name:entry.name});
assert.ok(chosen,"same name in two rows must match only requested clause");
assert.equal(chosen.items[0].str,items.at(-1).str);
assert.equal(api.findLine(items,{number:"14.2.4",name:"นายรัฐเขต ขัดบง"}),null);
assert.equal(api.findLine(items,{number:"14.2",name:entry.name}),null,"prevent prefix match");
assert.equal(api.findLine(items,{number:"12.4",name:entry.name}).items[0].str,items[0].str);
const split=[item("14.2.3",100,100,52),item("ว่าที่ร้อยตรีเสกศิลป์",155,100,120),item("รัตนา",285,100,48)];
assert.ok(api.findLine(split,{number:"14.2.3",name:"ว่าที่ร้อยตรีเสกศิลป์ รัตนา"}),"line fragments must join");
assert.equal(api.findLine([...items,item("14.2.4 นายวีรภัทร ศรีนวล",135,31)],
  {number:entry.number,name:entry.name}),null,"ambiguous duplicated clause must not highlight");
const marks=[];
const overlay={style:{},ownerDocument:{createElement:()=>({style:{},setAttribute(){}})},
  replaceChildren(){marks.length=0;},appendChild(x){marks.push(x);}};
const viewport={width:595,height:842,scale:1,convertToViewportPoint(x,y){return [x,842-y];}};
const canvas={style:{width:"595px",height:"842px"}};
const result=api.draw({items,target:{number:entry.number,name:entry.name},viewport,overlay,canvas});
assert.ok(result);
assert.equal(marks.length,1);
assert.equal(marks[0].className,"committee-pdf-name-highlight");
assert.ok(parseFloat(marks[0].style.top)>770,"match should point at the chosen bottom line");
assert.equal(overlay.style.width,"595px");
assert.equal(api.draw({items,target:{number:"14.2.4",name:"ไม่พบชื่อคนนี้"},viewport,overlay,canvas}),null);
assert.equal(marks.length,0,"stale marker must clear on failed match");
console.log("R19-J PASS: number+Thai name row match, duplicate protection, overlay geometry and committee-only mobile UI");
