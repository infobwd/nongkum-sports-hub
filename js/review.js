/* R11D read-only 237-item PDF preview. Changes are sent in ChatGPT by the organizer, not written here. */
(function(){
  "use strict";
  const M=globalThis.NongkumReviewModel;
  const NK=globalThis.Nongkum;
  const PAGE_SIZE=8;
  const SEARCH_DELAY_MS=280;
  const $=id=>document.getElementById(id);
  const ui={
    school:$("reviewSchool"),sport:$("reviewSport"),level:$("reviewLevel"),search:$("reviewSearch"),
    qaOnly:$("reviewQaOnly"),clear:$("clearFilters"),refresh:$("reviewRefresh"),
    extraFilters:$("reviewExtraFilters"),extraHint:$("reviewExtraHint"),collapseExtras:$("reviewCollapseExtras"),
    count:$("reviewCount"),status:$("reviewStatus"),skeleton:$("reviewSkeleton"),
    failure:$("reviewLoadFailure"),retry:$("retryReview"),listing:$("reviewListing"),
    cards:$("reviewCards"),empty:$("reviewEmpty"),more:$("reviewMore"),
    direct:$("reviewDirect"),directCard:$("reviewDirectCard"),
    directError:$("reviewDirectError"),
    copyFallback:$("copyFallback"),copyFallbackText:$("copyFallbackText"),
    revision:$("revisionLabel"),statMatches:$("statMatches"),
    statTrack:$("statTrack"),statLanes:$("statLanes"),statQa:$("statQa"),
    pdfPreview:$("pdfPreview"),pdfClose:$("pdfPreviewClose"),
    pdfFrame:$("pdfPreviewFrame"),pdfContext:$("pdfPreviewContext"),
    pdfDetails:$("reviewPdfDetails"),main:$("reviewMain"),header:$("reviewHeader"),
    footer:$("reviewFooter"),bottomNav:$("reviewBottomNav")
  };
  let data=null,byId=new Map(),sportNames=new Map(),qaNotes=new Map();
  let changes=new Map(),filtered=[],renderedCount=0;
  let filterSignature=null,directRenderedId=null,searchDebounce=null,isComposing=false;
  let loading=false,requestSerial=0;
  let pdfReturnFocus=null,pdfReturnScroll=null,pdfEntryMainScroll=null;
  const isCompactPdf=()=>typeof window!=="undefined"&&typeof window.matchMedia==="function"&&window.matchMedia("(max-width:1000px)").matches;
  const isMobileReview=()=>typeof window!=="undefined"&&typeof window.matchMedia==="function"&&window.matchMedia("(max-width:690px)").matches;
  // On mobile the full-PDF tools are available after the match list, initially collapsed.
  if(ui.pdfDetails&&isMobileReview())ui.pdfDetails.open=false;

  function make(tag,cls,text){
    const el=document.createElement(tag);
    if(cls)el.className=cls;
    if(text!==undefined&&text!==null)el.textContent=String(text);
    return el;
  }
  function add(parent,tag,cls,text){
    const node=make(tag,cls,text);
    parent.appendChild(node);
    return node;
  }
  function addSource(parent,label,value){
    const div=add(parent,"div","review-source-box");
    add(div,"span","",label);
    add(div,"strong","",value==null||String(value).trim()===""?"ไม่ระบุ":value);
  }
  function getSport(f){return sportNames.get(f.sport_id)||f.sport_id;}
  function formatTeam(f,side){
    const label=side==="A"?f.source_team_a_label:f.source_team_b_label;
    return label||"รอผลจากคู่ก่อนหน้า";
  }
  function addLanes(card,f){
    const heading=add(card,"div","review-pdf-label","ลู่ตาม PDF · "+(f.lanes?.length||0)+" แถว");
    heading.setAttribute("data-review-lanes","true");
    const list=add(card,"ul","review-lane-list");
    for(const lane of f.lanes||[]){
      const li=add(list,"li");
      add(li,"b","","ลู่ "+lane.lane);
      add(li,"span","",lane.source_school_label|| (lane.vacant?"ว่าง":"ไม่ระบุโรงเรียน"));
    }
  }
  function addQa(card,f){
    if(!M.hasQa(f))return;
    const box=add(card,"div","review-qa-box");
    add(box,"strong","","ควรตรวจสอบข้อมูล "+f.qa_flags.length+" เรื่อง");
    f.qa_flags.forEach((flag,index)=>{
      add(box,"p","",(index+1)+". "+(qaNotes.get(flag)||"รายการนี้มีหมายเหตุให้ผู้จัดตรวจเพิ่มเติม"));
    });
    const codes=add(box,"details","review-admin-codes");
    add(codes,"summary","","รหัสอ้างอิงสำหรับผู้ดูแล");
    add(codes,"span","",f.qa_flags.join(", "));
  }
  const DIFF_LABELS={
    time:"เวลา",field:"สนาม",source_match_no:"เลขคู่",source_page:"หน้า PDF",
    source_pair_text:"ข้อความคู่แข่งขัน",division:"รุ่น/ประเภท",
    team_a_id:"ทีม ก",team_b_id:"ทีม ข",round:"รอบแข่งขัน",
    source_team_a_label:"ชื่อทีม ก",source_team_b_label:"ชื่อทีม ข",
    date:"วันที่"
  };
  function addDiff(card,f){
    const item=changes.get(f.id);
    if(!item||!item.changes)return;
    const entries=Object.entries(item.changes).filter(([k])=>DIFF_LABELS[k]);
    if(!entries.length)return;
    const details=add(card,"details","review-compare");
    add(details,"summary","","ดูสิ่งที่เปลี่ยนจากฉบับก่อน ("+entries.length+" จุด)");
    const ul=add(details,"ul");
    for(const [key,change] of entries){
      add(ul,"li","",DIFF_LABELS[key]+": เดิม "+String(change.active??"ไม่ระบุ")+
        " → PDF ล่าสุด "+String(change.candidate??"ไม่ระบุ"));
    }
  }
  function makeCard(f){
    const article=make("article","review-item"+(M.hasQa(f)?" is-qa":""));
    article.setAttribute("data-fixture-id",f.id);
    const head=add(article,"div","review-item-head");
    const left=add(head,"div");
    add(left,"div","review-sport",getSport(f));
    add(left,"div","review-division",f.division||"ไม่ระบุรุ่น");
    const headRight=add(head,"div","review-head-right");
    if(M.hasQa(f))add(headRight,"span","review-flag","ควรตรวจซ้ำ");
    add(headRight,"span","review-number",(f.kind==="track_event"?"รายการ ":"คู่ ")+(f.source_match_no||"—"));

    if(f.kind==="track_event"){
      add(article,"h3","review-item-title",f.name||f.source_title||"รายการกรีฑา");
      add(article,"p","review-compact-lane-note","กรีฑา "+(f.lanes?.length||0)+" ลู่ • กดดูรายชื่อลู่ด้านล่าง");
    }else{
      const line=add(article,"div","review-match");
      add(line,"div","review-match-team",formatTeam(f,"A"));
      add(line,"span","review-match-vs","พบ");
      add(line,"div","review-match-team",formatTeam(f,"B"));
    }

    const dateTime=add(article,"div","review-date-time");
    const day=add(dateTime,"div","review-when");
    add(day,"span","review-time-caption","วันที่ตามสูจิบัตร");
    add(day,"strong","",M.sourceDate(f));
    const time=add(dateTime,"div","review-when");
    add(time,"span","review-time-caption","เวลาในสูจิบัตร");
    add(time,"strong","",M.sourceTime(f)+(M.sourceTime(f)==="ไม่ระบุ"?"":" น."));
    add(article,"p","review-venue","สนามตามสูจิบัตร: "+M.sourceField(f));
    if(M.hasConfirmedPlanning(f)){
      const notice=add(article,"p","review-confirmed-compact",
        "✓ ยืนยันวันและสถานที่: "+M.thaiDate(f.planning_date)+" · "+f.planning_venue);
      notice.setAttribute("title","ยังไม่ยืนยันเวลาและสนามรายคู่");
      add(article,"p","review-mini-warning","เวลาและสนามรายคู่ยังรอตรวจสอบ");
    }else{
      add(article,"p","review-mini-warning","วัน เวลา และสนามตามสูจิบัตรยังรอตรวจสอบ");
    }

    const actions=add(article,"div","review-action-bar");
    const copy=add(actions,"button","review-action primary","แจ้งข้อมูลไม่ตรง");
    copy.type="button";
    copy.setAttribute("aria-label","คัดลอกข้อความแจ้งแก้ไข "+getSport(f)+" "+(f.division||""));
    copy.addEventListener("click",()=>copyText(M.formatIssue(f,getSport(f)),"คัดลอกข้อความแจ้งแก้ไขแล้ว"));
    const pdfPage=Number(f.source_pdf?.page);
    if(Number.isInteger(pdfPage)&&pdfPage>=1&&pdfPage<=41){
      const openSource=add(actions,"button","review-action pdf-source-action","ดูต้นฉบับ หน้า "+pdfPage);
      openSource.type="button";
      openSource.setAttribute("aria-label","เปิดสูจิบัตร PDF หน้า "+pdfPage+" เพื่อเทียบกับรายการนี้");
      openSource.addEventListener("click",()=>openPdfPreview(f,openSource));
    }

    const details=add(article,"details","review-card-details");
    add(details,"summary","","ดูรายละเอียดเพิ่มเติม");
    const extra=add(details,"div","review-extra-content");
    if(f.kind==="track_event")addLanes(extra,f);
    else if(f.source_pair_text)add(extra,"p","review-source-note","ข้อความตามสูจิบัตร: "+f.source_pair_text);
    const source=add(extra,"div","review-source-grid");
    addSource(source,"รอบการแข่งขัน",f.round||"ไม่ระบุ");
    addSource(source,"หน้าในสูจิบัตร",f.source_page||"ไม่ระบุ");
    addQa(extra,f);
    addDiff(extra,f);
    const admin=add(extra,"details","review-admin-codes");
    add(admin,"summary","","รหัสอ้างอิงสำหรับผู้ดูแล");
    add(admin,"p","review-source-note","รหัสรายการ: "+f.id);
    const link=add(extra,"button","review-action secondary","แชร์ลิงก์รายการนี้");
    link.type="button";
    link.addEventListener("click",()=>{
      const url=new URL("./review.html",location.href);
      url.searchParams.set("fixture",f.id);
      copyText(url.toString(),"คัดลอกลิงก์รายการแล้ว");
    });
    return article;
  }
  function updatePdfModality(){
    if(ui.pdfPreview.hidden)return;
    const compact=isCompactPdf();
    // Desktop is a non-modal comparison pane; mobile is a real dialog.
    ui.pdfPreview.setAttribute("aria-modal",compact?"true":"false");
    for(const el of [ui.main,ui.header,ui.footer,ui.bottomNav]){
      if(el)el.inert=compact;
    }
    if(!compact&&pdfEntryMainScroll===null&&ui.main&&typeof ui.main.scrollTop==="number"){
      const initial=Math.max(0,(pdfReturnScroll||0)-(Number(ui.header?.offsetHeight)||0));
      ui.main.scrollTop=initial;
      pdfEntryMainScroll=ui.main.scrollTop;
    }
  }
  function openPdfPreview(f,button){
    const page=Number(f.source_pdf?.page);
    // Pages are taken from R11A source_pdf.page, never from fixture/order numbers.
    if(!Number.isInteger(page)||page<1||page>41)return;
    if(ui.pdfPreview.hidden){
      pdfReturnFocus=button;
      pdfReturnScroll=typeof window!=="undefined" ? window.scrollY : null;
      pdfEntryMainScroll=null;
    }
    ui.pdfContext.textContent=getSport(f)+" · "+(f.division||"")+" · หน้า "+page;
    const url=new URL("./pdf-viewer.html",location.href);
    url.searchParams.set("page",String(page));
    url.searchParams.set("fixture",f.id);
    url.searchParams.set("embedded","1");
    // Same-origin viewer reads a fixed local PDF: do not accept arbitrary file URLs.
    ui.pdfPreview.hidden=false;
    document.body.classList.add("review-pdf-open");
    updatePdfModality();
    ui.pdfFrame.src=url.toString(); // Load the PDF.js iframe only on user action.
    ui.pdfClose.focus();
  }
  function closePdfPreview(){
    if(ui.pdfPreview.hidden)return;
    let restore=pdfReturnScroll;
    if(!isCompactPdf()&&pdfEntryMainScroll!==null&&
       ui.main&&typeof ui.main.scrollTop==="number"&&typeof restore==="number"){
      restore=Math.max(0,restore+ui.main.scrollTop-pdfEntryMainScroll);
    }
    ui.pdfPreview.hidden=true;
    ui.pdfFrame.removeAttribute("src"); // Release PDF.js canvas + worker when closed.
    document.body.classList.remove("review-pdf-open");
    for(const el of [ui.main,ui.header,ui.footer,ui.bottomNav]){
      if(el)el.inert=false;
    }
    if(pdfReturnFocus?.isConnected)pdfReturnFocus.focus({preventScroll:true});
    if(restore!==null&&typeof window!=="undefined"){
      window.scrollTo(0,restore);
    }
    pdfReturnFocus=null;
    pdfReturnScroll=null;
    pdfEntryMainScroll=null;
  }
  async function copyText(text,success){
    ui.copyFallback.hidden=true;
    try{
      if(!navigator.clipboard||typeof navigator.clipboard.writeText!=="function")throw Error("no clipboard");
      await navigator.clipboard.writeText(text);
      ui.status.textContent=success+" · นำไปส่งในแชทและระบุข้อมูลที่ถูกต้องได้เลย";
    }catch(_){
      ui.copyFallback.hidden=false;
      ui.copyFallbackText.value=text;
      ui.copyFallbackText.focus();
      ui.copyFallbackText.select();
      ui.status.textContent="เครื่องนี้ไม่รองรับการคัดลอกอัตโนมัติ เลือกและคัดลอกข้อความในกล่องด้านล่าง";
      ui.copyFallback.scrollIntoView({block:"nearest",behavior:"auto"});
    }
  }
  function filters(){
    return {school:ui.school.value,sport:ui.sport.value,level:ui.level.value,
      search:ui.search.value.trim(),qaOnly:ui.qaOnly.checked};
  }
  function syncUrl(clearFixture){
    const url=new URL(location.href);
    const f=filters();
    for(const [key,value] of Object.entries(f)){
      const queryKey=key==="search"?"q":key==="qaOnly"?"qa":key;
      if(value)url.searchParams.set(queryKey,value===true?"1":value);
      else url.searchParams.delete(queryKey);
    }
    if(clearFixture)url.searchParams.delete("fixture");
    const next=url.pathname+url.search+url.hash;
    const current=location.pathname+location.search+location.hash;
    if(next!==current)history.replaceState(null,"",next);
    if(clearFixture)renderDirect();
  }
  function populateOptions(){
    const schoolValue=ui.school.value,sportValue=ui.sport.value;
    for(const item of data.schools){
      const option=make("option","",item.short||item.name);
      option.value=item.id;
      ui.school.appendChild(option);
    }
    for(const item of data.sports){
      const option=make("option","",(item.emoji?item.emoji+" ":"")+item.name);
      option.value=item.id;
      ui.sport.appendChild(option);
    }
    ui.school.value=schoolValue;
    ui.sport.value=sportValue;
  }
  function renderDirect(){
    if(!data)return;
    const directId=new URLSearchParams(location.search).get("fixture");
    if(directRenderedId===directId)return;
    directRenderedId=directId;
    ui.direct.hidden=!directId;
    ui.directCard.replaceChildren();
    ui.directError.hidden=true;
    if(!directId)return;
    const item=byId.get(directId);
    if(item)ui.directCard.appendChild(makeCard(item));
    else ui.directError.hidden=false;
  }
  function updateCount(){
    ui.count.textContent="แสดง "+renderedCount+" จาก "+filtered.length+" รายการ";
    ui.empty.hidden=filtered.length!==0;
    ui.more.hidden=renderedCount>=filtered.length;
    ui.more.textContent="ดูเพิ่มอีก "+Math.min(PAGE_SIZE,Math.max(0,filtered.length-renderedCount))+" รายการ";
  }
  function appendMore(){
    const next=Math.min(filtered.length,renderedCount+PAGE_SIZE);
    const fragment=document.createDocumentFragment();
    for(let i=renderedCount;i<next;i++)fragment.appendChild(makeCard(filtered[i]));
    ui.cards.appendChild(fragment);
    renderedCount=next;
    updateCount();
  }
  function render(force){
    if(!data)return;
    const f=filters();
    const signature=JSON.stringify(f);
    if(!force&&filterSignature===signature)return;
    filterSignature=signature;
    filtered=M.filterItems(data.fixtures,f,NK.classifyLevel,sportNames);
    renderedCount=0;
    const fragment=document.createDocumentFragment();
    const initial=Math.min(PAGE_SIZE,filtered.length);
    for(let i=0;i<initial;i++)fragment.appendChild(makeCard(filtered[i]));
    ui.cards.replaceChildren(fragment);
    renderedCount=initial;
    updateCount();
    renderDirect();
    const selected=[!!f.level,!!f.qaOnly,!!f.search].filter(Boolean).length;
    // Keep the active-filter count visible even when advanced controls are folded.
    ui.extraHint.textContent=selected?"ใช้ "+selected+" ตัวเลือก":"";
  }
  function applyFilter(){
    if(searchDebounce!==null){clearTimeout(searchDebounce);searchDebounce=null;}
    syncUrl(true);
    render(false);
  }
  function restoreFilters(){
    const qs=new URLSearchParams(location.search);
    ui.school.value=qs.get("school")||"";
    ui.sport.value=qs.get("sport")||"";
    ui.level.value=qs.get("level")||"";
    ui.search.value=qs.get("q")||"";
    ui.qaOnly.checked=qs.get("qa")==="1";
    ui.extraFilters.open=!!(ui.level.value||ui.search.value||ui.qaOnly.checked);
  }
  function updateSummary(){
    ui.statMatches.textContent=data.fixtures.filter(x=>x.kind==="match").length;
    ui.statTrack.textContent=data.fixtures.filter(x=>x.kind==="track_event").length;
    ui.statLanes.textContent=data.fixtures.filter(x=>x.kind==="track_event")
      .reduce((sum,x)=>sum+(x.lanes?.length||0),0);
    ui.statQa.textContent=data.fixtures.filter(M.hasQa).length;
    ui.revision.textContent="ฉบับปรับปรุง 4 พ.ย. 2569 · ข้อมูลรอตรวจสอบ";
  }
  async function fetchJson(path){
    const response=await fetch(path+"?v="+Date.now(),{cache:"no-store"});
    if(!response.ok)throw Error("HTTP "+response.status);
    return response.json();
  }
  async function load(){
    if(loading)return;
    loading=true;
    const serial=++requestSerial;
    const first=!data;
    ui.refresh.disabled=true;
    ui.listing.setAttribute("aria-busy","true");
    ui.failure.hidden=true;
    if(first)ui.skeleton.hidden=false;
    else ui.status.textContent="กำลังตรวจข้อมูลฉบับใหม่ โดยยังแสดงรายการเดิมไว้…";
    try{
      const candidate=M.validate(await fetchJson(M.SOURCE_PATH));
      if(serial!==requestSerial)return;
      let diff=null;
      try{
        diff=await fetchJson(M.DIFF_PATH);
        if(diff?.references?.canonical_candidate_revision!==M.REVISION ||
           diff?.summary?.candidate_total!==candidate.fixtures.length)diff=null;
      }catch(_){ /* optional comparison; preview remains usable */ }
      if(serial!==requestSerial)return;
      data=candidate;
      byId=new Map(data.fixtures.map(x=>[x.id,x]));
      sportNames=new Map(data.sports.map(x=>[x.id,(x.emoji?x.emoji+" ":"")+x.name]));
      qaNotes=new Map((data.source_qa||[]).map(x=>[x.code,x.description]));
      changes=new Map((diff?.changes||[]).map(x=>[x.id,x]));
      if(first){
        populateOptions();
        restoreFilters();
      }
      ui.skeleton.hidden=true;
      ui.failure.hidden=true;
      ui.listing.setAttribute("aria-busy","false");
      updateSummary();
      filterSignature=null;
      directRenderedId=null;
      render(true);
      ui.status.textContent=NK.formatCheckedAt(new Date())+
        " · ข้อมูลจากสูจิบัตรฉบับใหม่ (ยังไม่รับรอง)"+
        (!diff?" · ดูความแตกต่างจากฉบับเดิมไม่ได้ในขณะนี้":"");
    }catch(err){
      ui.skeleton.hidden=true;
      ui.listing.setAttribute("aria-busy","false");
      if(first){
        ui.failure.hidden=false;
        ui.count.textContent="ยังโหลดรายการไม่ได้";
        ui.status.textContent="เชื่อมต่อข้อมูลร่างไม่สำเร็จ · ลองอีกครั้ง";
      }else{
        ui.status.textContent="รีเฟรชไม่สำเร็จ · ยังแสดงข้อมูลฉบับก่อนหน้าที่โหลดได้";
      }
      if(globalThis.console&&console.error)console.error("R11D read-only fetch failed",err);
    }finally{
      loading=false;
      ui.refresh.disabled=false;
    }
  }
  for(const element of [ui.school,ui.sport,ui.level,ui.qaOnly]){
    element.addEventListener("change",applyFilter);
  }
  ui.search.addEventListener("compositionstart",()=>{
    isComposing=true;
    if(searchDebounce!==null){clearTimeout(searchDebounce);searchDebounce=null;}
  });
  ui.search.addEventListener("compositionend",()=>{
    isComposing=false;
    if(searchDebounce!==null)clearTimeout(searchDebounce);
    searchDebounce=setTimeout(()=>{searchDebounce=null;applyFilter();},SEARCH_DELAY_MS);
  });
  ui.search.addEventListener("input",()=>{
    if(isComposing)return;
    if(searchDebounce!==null)clearTimeout(searchDebounce);
    searchDebounce=setTimeout(()=>{searchDebounce=null;applyFilter();},SEARCH_DELAY_MS);
  });
  ui.more.addEventListener("click",appendMore);
  ui.clear.addEventListener("click",()=>{
    ui.school.value="";ui.sport.value="";ui.level.value="";ui.search.value="";
    ui.qaOnly.checked=false;ui.extraFilters.open=false;applyFilter();
  });
  ui.collapseExtras.addEventListener("click",()=>{
    ui.extraFilters.open=false;
    // Do not clear active search/QA selections when folding the panel.
    const summary=ui.extraFilters.querySelector?.("summary");
    if(summary&&typeof summary.focus==="function")summary.focus({preventScroll:true});
  });
    ui.refresh.addEventListener("click",load);
  ui.retry.addEventListener("click",load);
  ui.pdfClose.addEventListener("click",closePdfPreview);
  if(typeof window!=="undefined"&&typeof window.addEventListener==="function"){
    window.addEventListener("message",event=>{
      // Only the currently opened, same-origin PDF iframe may request a close.
      if(ui.pdfPreview.hidden||event.origin!==location.origin||
         event.source!==ui.pdfFrame.contentWindow||
         event.data?.type!=="nongkum:close-pdf-viewer")return;
      closePdfPreview();
    });
  }
  if(typeof window!=="undefined"&&typeof window.addEventListener==="function"){
    window.addEventListener("resize",()=>{if(!ui.pdfPreview.hidden)updatePdfModality();});
  }
  if(typeof document.addEventListener==="function"){
    document.addEventListener("keydown",event=>{
      if(ui.pdfPreview.hidden)return;
      if(event.key==="Escape"){event.preventDefault();closePdfPreview();return;}
      // Keep keyboard focus in the fullscreen PDF viewer on mobile.
      if(event.key==="Tab"&&isCompactPdf()){
        const active=document.activeElement;
        if(event.shiftKey&&(active===ui.pdfClose||active!==ui.pdfFrame)){
          event.preventDefault();ui.pdfFrame.focus();
        }else if(!event.shiftKey&&active===ui.pdfFrame){
          event.preventDefault();ui.pdfClose.focus();
        }
      }
    });
  }
  load();
})();