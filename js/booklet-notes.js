/* R24-I: booklet notes page; purely read-only, does not alter approvals, fixtures or results. */
(function(){
  "use strict";
  const model=globalThis.NongkumBookletNotes;
  const $=id=>document.getElementById(id);
  const ui={
    status:$("notesStatus"),app:$("notesApp"),list:$("notesList"),empty:$("notesEmpty"),
    total:$("notesTotal"),urgent:$("notesUrgent"),pending:$("notesPending"),
    hint:$("notesSourceHint"),count:$("notesCount"),search:$("notesSearch"),
    priority:$("notesPriority"),sport:$("notesSport"),state:$("notesState"),
    reset:$("notesReset"),fallback:$("notesCopyFallback"),copyText:$("notesCopyText"),
    copyClose:$("notesCopyClose")
  };
  const sportLabels={football:"ฟุตบอล",volleyball:"วอลเลย์บอล",petanque:"เปตอง",
    takraw:"เซปักตะกร้อ",athletics:"กรีฑา"};
  const priorityLabels={urgent:"ต้องตรวจก่อนแข่งขัน",important:"ควรตรวจก่อนรับรอง",followup:"ตรวจเพิ่มเติม"};
  const stateLabels={needs_review:"รอผู้รับผิดชอบตรวจ",
    web_handled_document_pending:"ปรับในเว็บแล้ว · รอตรวจสูจิบัตร",
    reference_only:"ข้อมูลอ้างอิง"};
  let data=null;
  const requestedNote=new URLSearchParams(location.search).get("note")||"";
  const safeRequestedNote=/^[A-Z0-9-]{4,70}$/.test(requestedNote)?requestedNote:"";
  let noteFocused=false;
  function node(tag,cls,text){
    const el=document.createElement(tag);
    if(cls)el.className=cls;
    if(text!==undefined)el.textContent=text;
    return el;
  }
  function link(href,label,cls){
    const a=node("a",cls||"notes-action",label);
    a.href=href;
    return a;
  }
  function sectionText(parent,label,value){
    const p=node("p","notes-paragraph");
    p.append(node("strong","",label+" "),document.createTextNode(value));
    parent.append(p);
  }
  function showStatus(message,isError){
    ui.status.textContent=message;
    ui.status.dataset.error=isError?"true":"false";
    ui.status.setAttribute("role",isError?"alert":"status");
  }
  function showCopyFallback(text){
    ui.copyText.value=text;
    ui.fallback.hidden=false;
    ui.copyText.focus();
    ui.copyText.select();
  }
  async function copyNote(note){
    const text=model.copyText(note);
    try{
      if(!navigator.clipboard?.writeText)throw Error("clipboard_not_available");
      await navigator.clipboard.writeText(text);
      showStatus("คัดลอกข้อสังเกตแล้ว สามารถนำไปส่งผู้จัดพร้อมหลักฐานได้",false);
    }catch(_){
      showCopyFallback(text);
      showStatus("อุปกรณ์นี้ไม่อนุญาตคัดลอกอัตโนมัติ เลือกคัดลอกข้อความในช่องด้านล่างได้",false);
    }
  }
  function createCard(n){
    const card=node("article","notes-card");
    card.dataset.priority=n.priority;
    card.id="note-"+n.id;
    const head=node("div","notes-card-head");
    head.append(node("h3","",n.title));
    card.append(head);
    const chips=node("div","notes-chips");
    chips.append(node("span","notes-chip priority-"+n.priority,priorityLabels[n.priority]));
    chips.append(node("span","notes-chip "+(
      n.state==="needs_review"?"state-pending":n.state==="reference_only"?"state-context":"state-web"
    ),stateLabels[n.state]));
    chips.append(node("span","notes-chip",n.sport?(sportLabels[n.sport]||"ชนิดกีฬา"):"สูจิบัตร"));
    card.append(chips);
    n.findings.forEach((finding,i)=>sectionText(card,
      n.findings.length>1?"จุดที่ต้องตรวจ "+(i+1)+":":"สิ่งที่พบ:",finding));
    sectionText(card,"ผลกระทบที่ต้องตรวจ:",n.impact);
    sectionText(card,"สิ่งที่ต้องพิจารณา:",n.action);
    const more=node("details");
    more.append(node("summary","","ดูที่มาของข้อมูล"));
    if(n.pages.length)more.append(node("p","","สูจิบัตรฉบับแข่งขัน หน้า "+n.pages.join(", ")));
    for(const e of n.evidence){
      const p=node("p");
      p.append(link(e.url,"อ่านบันทึกประกอบ","notes-evidence"));
      more.append(p);
    }
    card.append(more);
    const actions=node("div","notes-actions");
    n.pages.forEach(pg=>actions.append(link("./pdf-viewer.html?page="+pg+
      "&note="+encodeURIComponent(n.id),"ดูจุดที่ต้องตรวจ · หน้า "+pg)));
    actions.append(link("./booklet-drive-viewer.html?note="+encodeURIComponent(n.id),
      "อ่านเล่มรวม 155 หน้า"));
    const copy=node("button","notes-copy","คัดลอกข้อความ");
    copy.type="button";
    copy.addEventListener("click",()=>copyNote(n));
    actions.append(copy);
    card.append(actions);
    return card;
  }
  function render(){
    if(!data)return;
    const filtered=model.filter(data.notes,{
      query:ui.search.value,priority:ui.priority.value,
      sport:ui.sport.value,state:ui.state.value
    });
    ui.list.replaceChildren(...filtered.map(createCard));
    ui.empty.hidden=filtered.length!==0;
    ui.count.textContent="แสดง "+filtered.length+" จาก "+data.counts.total+" เรื่อง";
    if(!noteFocused&&safeRequestedNote&&data.notes.some(n=>n.id===safeRequestedNote)){
      noteFocused=true;
      requestAnimationFrame(()=>{
        const target=document.getElementById("note-"+safeRequestedNote);
        if(!target)return;
        target.classList.add("r24k-note-return");
        target.scrollIntoView({block:"start",behavior:"auto"});
        const title=target.querySelector("h3");
        if(title){title.setAttribute("tabindex","-1");title.focus({preventScroll:true});}
      });
    }
  }
  async function load(){
    try{
      const responses=await Promise.all([
        fetch("./data/booklet-observations-2569.json",{cache:"no-store"}),
        fetch("./data/program-from-pdf-2569-20261104-draft.json",{cache:"no-store"})
      ]);
      if(responses.some(r=>!r.ok))throw Error("cannot_load");
      const docs=await Promise.all(responses.map(r=>r.json()));
      data=model.build(docs[0],docs[1]);
      ui.total.textContent=String(data.counts.total);
      ui.urgent.textContent=String(data.counts.urgent);
      ui.pending.textContent=String(data.counts.needs_review);
      ui.hint.textContent="รวบรวมจากข้อสังเกตในสูจิบัตรเดิม "+data.source_qa_count+
        " ข้อ และเอกสารประกอบอื่น ๆ · ไม่ได้หมายความว่าทุกเรื่องเป็นข้อผิดพลาด";
      const sports=[...new Set(data.notes.map(n=>n.sport).filter(Boolean))];
      sports.sort((a,b)=>(sportLabels[a]||a).localeCompare(sportLabels[b]||b,"th"));
      for(const s of sports){
        const option=node("option","",sportLabels[s]||s);
        option.value=s;
        ui.sport.append(option);
      }
      ui.app.hidden=false;
      render();
      showStatus("เปิดรายการที่ควรตรวจสอบแล้ว",false);
    }catch(err){
      ui.app.hidden=true;
      showStatus("ยังเปิดรายการที่ควรตรวจไม่ได้ โปรดลองกดอัปเดตอีกครั้ง หากยังมีปัญหาให้แจ้งผู้ดูแลเว็บไซต์",true);
    }
  }
  [ui.search,ui.priority,ui.sport,ui.state].forEach(x=>x.addEventListener(x===ui.search?"input":"change",render));
  ui.reset.addEventListener("click",()=>{
    ui.search.value="";ui.priority.value="";ui.sport.value="";ui.state.value="";render();
  });
  ui.copyClose.addEventListener("click",()=>{ui.fallback.hidden=true;ui.copyText.value="";});
  $("notesRefresh").addEventListener("click",()=>window.location.reload());
  $("notesBackToTop").addEventListener("click",()=>{
    const reduced=window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({top:0,behavior:reduced?"auto":"smooth"});
  });
  /* Refresh by pulling down only when already at the top; standard scrolling remains untouched. */
  let pullStart=null;
  window.addEventListener("touchstart",e=>{
    pullStart=window.scrollY<=2&&e.touches.length===1?
      {x:e.touches[0].clientX,y:e.touches[0].clientY}:null;
  },{passive:true});
  window.addEventListener("touchend",e=>{
    if(!pullStart||!e.changedTouches.length)return;
    const dx=Math.abs(e.changedTouches[0].clientX-pullStart.x);
    const dy=e.changedTouches[0].clientY-pullStart.y;
    pullStart=null;
    if(dy>=140&&dx<65&&window.scrollY<=2)window.location.reload();
  },{passive:true});

  if(!model){showStatus("ไม่สามารถเปิดเครื่องมือตรวจข้อสังเกตได้",true);return;}
  load();
})();
