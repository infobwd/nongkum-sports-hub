/* R24-D: read-only evidence report. Never write approvals or publish source PDF. */
(() => {
"use strict";
const $=id=>document.getElementById(id);
const ui={
 status:$("compareStatus"),metrics:$("compareSummary"),program:$("compareProgram"),
 staff:$("compareStaff"),sport:$("compareSport"),query:$("compareQuery"),
 list:$("compareItems"),count:$("compareCount"),more:$("compareMore"),
 fixtures:$("compareFixtures"),committee:$("compareCommittee"),
 integrated:$("compareIntegrated"),needs:$("compareNeedsReview"),
 copyLabel:$("compareCopyLabel"),copyText:$("compareCopyText")
};
const model=globalThis.NongkumBookletReconcile;
const sportNames={
 football:"ฟุตบอล",penalty:"ยิงจุดโทษ",futsal:"ฟุตซอล",
 volleyball:"วอลเลย์บอล",takraw:"เซปักตะกร้อ",
 petanque:"เปตอง",table_tennis:"เทเบิลเทนนิส",
 tug_of_war:"ชักเย่อ",athletics:"กรีฑา"
};
let data=null,shown=18;
function el(type,cls,value){
 const x=document.createElement(type);
 if(cls)x.className=cls;
 if(value!==undefined)x.textContent=value;
 return x;
}
function makeLink(href,text) {
 const a=el("a","",text);
 a.href=href;
 return a;
}
function validRoutes(item) {
 return item && /^[A-Za-z0-9_.\u0E00-\u0E7F-]{1,180}$/.test(item.id) &&
   Number.isInteger(item.v2_page) && item.v2_page>=1 && item.v2_page<=41;
}
function showStatus(text,error=false){
 ui.status.textContent=text;
 ui.status.dataset.error=String(error);
}
function makeCard(item) {
 const card=el("article","compare-record");
 const title=el("h3","", (sportNames[item.sport_id]||item.sport_id)+
    " · "+item.division+" · "+(item.kind==="track_event"?"รายการที่ ":"คู่ที่ ")+item.number);
 card.append(title);
 if(item.pair)card.append(el("p","summary",item.pair));
 const badge=el("span","flag"+(item.qa_count?" qa":""),item.qa_count?
   "พบข้อสังเกตจากต้นฉบับ · รอตรวจ":"รอตรวจข้อความรายช่อง");
 card.append(badge);
 card.append(el("p","evidence","พบพิกัดใน V2 หน้า "+item.v2_page+
   " และยืนยันรหัสอ้างอิงในเล่ม 155 หน้าแล้ว"));
 if(item.date_source) {
   card.append(el("p","evidence","วันที่ในเอกสารต้นทาง: "+item.date_source+
     (item.date_confirmation==="confirmed"?" · มีข้อมูลวันยืนยันแยกในระบบ":" · โปรดตรวจวันจริง")));
 }
 const actions=el("div","compare-actions");
 if(validRoutes(item)){
   actions.append(makeLink("./pdf-viewer.html?page="+item.v2_page+
     "&from=program&fixture="+encodeURIComponent(item.id),"เปิดใน V2"));
   actions.append(makeLink("./booklet-private-viewer.html?fixture="+encodeURIComponent(item.id),
     "ตรวจในเล่มรวม (ผู้มีสิทธิ์)"));
 }
 const copy=el("button","","คัดลอกรายการแจ้งตรวจ");
 copy.type="button";
 copy.addEventListener("click",()=>copyItem(item));
 actions.append(copy);
 card.append(actions);
 return card;
}
async function copyItem(item) {
 let text;
 try { text=model.issueText(item); } catch (_){showStatus("ไม่สามารถสร้างรายการแจ้งตรวจได้",true);return;}
 try {
   if (!navigator.clipboard?.writeText) throw Error("clipboard_unavailable");
   await navigator.clipboard.writeText(text);
   showStatus("คัดลอกรายการแจ้งตรวจแล้ว · กรุณาส่งให้ผู้รับผิดชอบผ่านช่องทางที่กำหนด");
 }catch(_){
   ui.copyLabel.hidden=false;
   ui.copyText.value=text;
   ui.copyText.focus();
   ui.copyText.select();
   showStatus("กรุณาคัดลอกข้อความในช่องด้านล่างเพื่อส่งให้ผู้จัด");
 }
}
function applyFilters() {
 if(!data)return [];
 const sport=ui.sport.value;
 const query=ui.query.value.trim().toLowerCase();
 return data.issues.filter(item=>
   (!sport||item.sport_id===sport)&&
   (!query||[item.id,item.division,item.pair,item.number,
     sportNames[item.sport_id]||item.sport_id].join(" ").toLowerCase().includes(query)));
}
function render() {
 if(!data)return;
 const items=applyFilters();
 const visible=items.slice(0,shown);
 ui.list.replaceChildren(...visible.map(makeCard));
 ui.count.textContent="แสดง "+visible.length+" จาก "+items.length+" รายการ · ข้อความรายช่องยังรอตรวจ";
 ui.more.hidden=items.length<=shown;
}
function populate(data) {
 ui.fixtures.textContent=String(data.counts.fixtures);
 ui.committee.textContent=String(data.counts.committee);
 ui.integrated.textContent=String(data.counts.integrated_anchors);
 ui.needs.textContent=String(data.counts.needs_review);
 const sports=[...new Set(data.issues.map(i=>i.sport_id))].sort();
 const options=sports.map(s=>{
   const opt=document.createElement("option");opt.value=s;
   opt.textContent=(sportNames[s]||s)+" ("+data.bySport[s].total+")";
   return opt;
 });
 ui.sport.append(...options);
 ui.metrics.hidden=false;ui.program.hidden=false;ui.staff.hidden=false;
 showStatus("ตรวจรุ่นและพิกัดเอกสารแล้ว · ยังไม่มีรายการใดรับรองความตรงกันของข้อความรายช่อง");
 render();
}
async function fetchJson(url) {
 const response=await fetch(url,{cache:"no-store"});
 if(!response.ok)throw Error("source_unavailable");
 return response.json();
}
async function load() {
 try {
  const [registry,source,roster,pmap,cmap]=await Promise.all([
    fetchJson("./data/booklet-versions.json?v=r24d1"),
    fetchJson("./data/program-from-pdf-2569-20261104-draft.json?v=r24d1"),
    fetchJson("./data/committee-2569-draft-public-review.json?v=r24d1"),
    fetchJson("./data/program-pdf-positions-v2.json?v=r24d1"),
    fetchJson("./data/committee-pdf-positions-v3.json?v=r24d1")
  ]);
  data=model.build(registry,source,roster,pmap,cmap);
  populate(data);
 }catch(err) {
  console.warn("R24-D evidence index mismatch or unavailable",err?.message);
  showStatus("ยังตรวจข้อมูลเทียบฉบับไม่ได้ เพราะแหล่งข้อมูลหรือรุ่นเอกสารไม่ครบ กรุณาใช้เอกสารต้นฉบับหรือแจ้งผู้จัด",true);
  ui.metrics.hidden=true;ui.program.hidden=true;ui.staff.hidden=true;
 }
}
ui.more.addEventListener("click",()=>{shown+=18;render();});
ui.sport.addEventListener("change",()=>{shown=18;render();});
ui.query.addEventListener("input",()=>{shown=18;render();});
load();
})();