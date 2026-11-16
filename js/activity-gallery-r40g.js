/* R40-G gallery: only public, validated photos from NongkumActivityMedia. */
(function(){
"use strict";
const $=id=>document.getElementById(id);
const ui={date:$("photoDate"),sport:$("photoSport"),clear:$("photoClear"),
 refresh:$("galleryRefresh"),status:$("galleryStatus"),notice:$("galleryNotice"),
 items:$("galleryItems"),empty:$("galleryEmpty"),viewer:$("galleryViewer"),
 large:$("galleryLargePhoto"),close:$("galleryClose"),title:$("galleryViewerTitle"),
 caption:$("galleryViewerCaption"),previous:$("galleryPrevious"),next:$("galleryNext"),
 count:$("galleryViewerCount")};
if(!ui.items)return;
const sportNames={athletics:"กรีฑา",football:"ฟุตบอล",futsal:"ฟุตซอล",
 volleyball:"วอลเลย์บอล",petanque:"เปตอง",takraw:"ตะกร้อ",
 tabletennis:"เทเบิลเทนนิส",tugofwar:"ชักเย่อ",shootout:"ยิงประตู"};
const create=(tag,cls,value)=>{
 const el=document.createElement(tag);
 if(cls)el.className=cls;
 if(value!==undefined)el.textContent=String(value);
 return el;
};
const eventFilter=new URLSearchParams(location.search).get("event")||"";
const validEvent=eventFilter.length>0&&eventFilter.length<=160?eventFilter:"";
const formatDate=date=>{
 if(!date)return "ยังไม่มีวันที่แข่งขันที่ยืนยัน";
 const d=new Date(date+"T12:00:00+07:00");
 if(!Number.isFinite(d.getTime()))return "ยังไม่มีวันที่แข่งขันที่ยืนยัน";
 return new Intl.DateTimeFormat("th-TH",{timeZone:"Asia/Bangkok",day:"numeric",
   month:"long",year:"numeric"}).format(d);
};
let items=[],visible=[],current=0;
function fillFilters(){
 const existingDay=ui.date.value,existingSport=ui.sport.value;
 const dates=[...new Set(items.map(x=>x.event_date).filter(Boolean))].sort();
 const sports=[...new Set(items.map(x=>x.sport_id))].sort();
 ui.date.replaceChildren(new Option("ทุกวัน",""));
 for(const d of dates)ui.date.appendChild(new Option(formatDate(d),d));
 ui.sport.replaceChildren(new Option("ทุกกีฬา",""));
 for(const s of sports)ui.sport.appendChild(new Option(sportNames[s]||s,s));
 ui.date.value=dates.includes(existingDay)?existingDay:"";
 ui.sport.value=sports.includes(existingSport)?existingSport:"";
}
function openPhoto(idx){
 current=idx;
 const x=visible[current];if(!x)return;
 ui.large.src=x.src;
 ui.large.alt=x.caption||"ภาพกิจกรรม";
 ui.title.textContent=(sportNames[x.sport_id]||x.sport_id)+" · "+x.division;
 ui.caption.textContent=x.caption;
 ui.count.textContent=(current+1)+" / "+visible.length;
 ui.previous.disabled=current===0;
 ui.next.disabled=current>=visible.length-1;
 if(!ui.viewer.open)ui.viewer.showModal();
}
function render(){
 const day=ui.date.value,sport=ui.sport.value;
 visible=items.filter(x=>(!day||x.event_date===day)&&(!sport||x.sport_id===sport)&&
   (!validEvent||x.event_id===validEvent));
 visible.sort((a,b)=>(b.event_date||"").localeCompare(a.event_date||"")||
   (a.event_id||"").localeCompare(b.event_id||"")||
   Date.parse(a.published_at||0)-Date.parse(b.published_at||0));
 ui.items.replaceChildren();
 const groups=new Map();
 for(const x of visible){
   const k=x.event_date||"";
   if(!groups.has(k))groups.set(k,[]);
   groups.get(k).push(x);
 }
 for(const [date,pics] of groups){
   const section=create("section","");
   section.appendChild(create("h2","gallery-day",formatDate(date)));
   const grid=create("div","gallery-grid");
   for(const photo of pics){
     const index=visible.indexOf(photo);
     const article=create("article","gallery-card"),button=create("button");
     button.type="button";
     button.setAttribute("aria-label","เปิดภาพ "+photo.caption);
     const img=create("img");
     img.src=photo.src;img.alt=photo.caption;
     img.loading="lazy";img.decoding="async";
     const info=create("span","gallery-card-info");
     info.append(create("strong","",sportNames[photo.sport_id]||photo.sport_id),
       create("small","",photo.division),
       create("small","",photo.caption));
     button.append(img,info);
     button.addEventListener("click",()=>openPhoto(index));
     article.append(button);grid.appendChild(article);
   }
   section.appendChild(grid);ui.items.appendChild(section);
 }
 ui.empty.hidden=visible.length!==0;
 ui.status.textContent="ภาพที่เผยแพร่แล้ว "+visible.length+" ภาพ";
}
async function load(){
 ui.refresh.disabled=true;
 ui.status.textContent="กำลังโหลดภาพที่เผยแพร่…";
 ui.notice.hidden=true;
 try{
   items=await globalThis.NongkumActivityMedia.list();
   fillFilters();render();
   if(globalThis.NongkumActivityMedia.source?.()==="r39-fallback"){
     ui.notice.textContent="ยังเชื่อมต่อภาพเผยแพร่ล่าสุดไม่ได้ ขณะนี้แสดงเฉพาะภาพที่ผู้จัดประกาศไว้ในระบบเดิม";
     ui.notice.hidden=false;
   }
 }catch(_){
   items=[];render();
   ui.notice.textContent="ไม่สามารถอ่านภาพกิจกรรมล่าสุดได้ กรุณาลองอีกครั้ง";
   ui.notice.hidden=false;
 }finally{ui.refresh.disabled=false;}
}
ui.date.addEventListener("change",render);
ui.sport.addEventListener("change",render);
ui.clear.addEventListener("click",()=>{ui.date.value="";ui.sport.value="";render();});
ui.refresh.addEventListener("click",load);
ui.close.addEventListener("click",()=>ui.viewer.close());
ui.previous.addEventListener("click",()=>openPhoto(Math.max(0,current-1)));
ui.next.addEventListener("click",()=>openPhoto(Math.min(visible.length-1,current+1)));
ui.viewer.addEventListener("close",()=>{ui.large.removeAttribute("src");});
load();
})();
