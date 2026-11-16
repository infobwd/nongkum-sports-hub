/* R34 — public approved-result card join and submit-only 6h editor.
   The shared PIN is never stored. A short-lived, revocable submit token is
   kept in this browser; publishing still requires separate human approval. */
(function (root) {
  "use strict";
  if (!document.body || !root.NongkumResultSource) return;
  const API = "https://zprxvpfkvforoxrboqiv.supabase.co/functions/v1/nongkum-results-editor";
  const STORAGE = "nongkum-r34-editor-session-v1";
  const REVIEW_STORAGE = "nongkum-r37-reviewer-session-v1";
  const REVIEW_API = "https://zprxvpfkvforoxrboqiv.supabase.co/functions/v1/nongkum-results-reviewer";
  function reviewerSession(){
    try{
      const v=JSON.parse(localStorage.getItem(REVIEW_STORAGE)||"null");
      return v&&/^[0-9a-f]{64}$/.test(v.token||"")&&Date.parse(v.expires_at)>Date.now()?v:null;
    }catch(_){return null;}
  }
  const escapeHtml = root.Nongkum?.escapeHtml || ((s)=>String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c])));
  const state = { session:null, active:null, fixture:null, approved:new Map(), schools:[], sports:[], source:"", refreshing:false };
  const overlay = document.createElement("div");
  overlay.id = "r34Overlay";
  overlay.className = "r34-overlay";
  overlay.hidden = true;
  overlay.innerHTML = "<div class='r34-dialog' role='dialog' aria-modal='true' aria-labelledby='r34Title'><div class='r34-header'><h2 id='r34Title'>บันทึกผลการแข่งขัน</h2><button type='button' class='r34-close' data-r34-close aria-label='ปิด'>×</button></div><p id='r34Status' class='r34-status' role='status' aria-live='polite'></p><div id='r34Body'></div></div>";
  document.body.appendChild(overlay);
  const modalBody=overlay.querySelector("#r34Body");
  const status=overlay.querySelector("#r34Status");
  function message(text, bad) { status.textContent=text||""; status.classList.toggle("r34-error",!!bad); }
  function close() {overlay.hidden=true;document.body.classList.remove("r34-open");state.active=null;state.fixture=null;modalBody.replaceChildren();}
  overlay.addEventListener("click",(e)=>{if(e.target===overlay || e.target.closest("[data-r34-close]"))close();});
  document.addEventListener("keydown",(e)=>{if(e.key==="Escape"&&!overlay.hidden)close();});
  function open() {overlay.hidden=false;document.body.classList.add("r34-open");message("");}
  function restoreSession(){
    try {
      const v=JSON.parse(localStorage.getItem(STORAGE)||"null");
      if(v&&/^[a-f0-9]{64}$/.test(v.token)&&Date.parse(v.expires_at)>Date.now()){
        state.session=v;return;
      }
    } catch(_) {}
    clearSession();
  }
  function clearSession() {state.session=null;try{localStorage.removeItem(STORAGE);}catch(_){}}
  restoreSession();
  async function call(action,data) {
    // Reviewer role is verified by the separate server gateway on every call.
    // No reviewer token is ever converted into an editor token in the browser.
    const reviewer=["status","fixture","submit"].includes(action)?reviewerSession():null;
    const h={"Content-Type":"application/json"};
    if(reviewer) h.Authorization="Bearer "+reviewer.token;
    else if(action!=="unlock") {
      if(!state.session?.token)return {ok:false,error:"expired"};
      h.Authorization="Bearer "+state.session.token;
    }
    const mapped=reviewer&&["fixture","submit"].includes(action)?"edit_"+action:action;
    const response=await fetch(reviewer?REVIEW_API:API,{method:"POST",cache:"no-store",headers:h,
      body:JSON.stringify({action:mapped,...(data||{})})});
    let result;
    try {result=await response.json();} catch(_){throw Error("network");}
    if(!result||typeof result.ok!=="boolean")throw Error("network");
    return result;
  }
  function explain(err){
    return ({
      wrong_pin:"รหัสไม่ถูกต้อง กรุณาลองใหม่",
      limited:"กรอกรหัสผิดหลายครั้ง กรุณาลองภายหลัง",
      expired:"ครบกำหนดเข้าใช้งาน กรุณากรอกรหัสใหม่",
      pending:"มีผลรายการนี้รอตรวจอยู่แล้ว กรุณาติดต่อผู้ตรวจผล",
      stale:"ผลรายการนี้มีการเปลี่ยนแปลง กรุณาเปิดการ์ดใหม่",
      invalid:"กรุณาตรวจข้อมูลที่กรอกอีกครั้ง",
      missing_fixture:"ไม่พบรายการนี้ในตารางแข่งขันที่ใช้งาน",
      teams_missing:"คู่แข่งขันนี้ยังไม่มีชื่อทีมครบ จึงบันทึกผลไม่ได้",
      reason_required:"กรุณาระบุเหตุผลการแก้ไขอย่างน้อย 8 ตัวอักษร",
      unavailable:"เชื่อมต่อระบบบันทึกผลไม่ได้ กรุณาลองอีกครั้ง",
      forbidden:"ไม่สามารถใช้งานจากหน้านี้ได้"
    })[err]||"ไม่สามารถดำเนินการได้ กรุณาลองใหม่";
  }
  function fillPin() {
    modalBody.innerHTML="<form id='r34PinForm'><p>กรอกรหัสสำหรับบันทึกผลครั้งแรก เครื่องนี้จะจำสิทธิ์ไว้ 6 ชั่วโมง โดยไม่จำรหัสผ่าน</p><label class='r34-field'>รหัสเข้าใช้งาน<input name='pin' type='password' inputmode='numeric' pattern='[0-9]*' autocomplete='off' maxlength='30' required></label><div class='r34-buttons'><button type='submit' class='r34-primary'>เข้าใช้งาน</button><button type='button' data-r34-close>ยกเลิก</button></div></form>";
    const form=modalBody.querySelector("#r34PinForm");
    form.querySelector("input").focus();
    form.addEventListener("submit", async(e)=>{
      e.preventDefault();
      const pin=form.elements.pin.value;
      const button=form.querySelector("[type=submit]");button.disabled=true;message("กำลังตรวจรหัส…");
      try{
        const answer=await call("unlock",{pin});
        form.elements.pin.value="";
        if(!answer.ok){message(explain(answer.error),true);return;}
        state.session={token:answer.token,expires_at:answer.expires_at};
        try{localStorage.setItem(STORAGE,JSON.stringify(state.session));}catch(_){}
        await loadFixture();
      }catch(_){message("เชื่อมต่อไม่ได้ กรุณาลองใหม่ โดยยังไม่บันทึกผล",true);}
      finally{button.disabled=false;}
    });
  }
  async function ensureUnlock(){
    const reviewer=reviewerSession();
    if(!reviewer && !state.session){fillPin();return;}
    try{
      const answer=await call("status");
      if(!answer.ok){
        if(reviewer){message("สิทธิ์ผู้ตรวจใช้ไม่ได้ กรุณาเข้าหน้ายืนยันผลอีกครั้ง",true);return;}
        clearSession();fillPin();message(explain(answer.error),true);return;
      }
      if(!reviewer)state.session.expires_at=answer.expires_at;
      await loadFixture();
    }catch(_){message("เชื่อมต่อไม่ได้ กรุณาลองอีกครั้ง",true);}
  }
  function displayRemaining() {
    const until=Date.parse((reviewerSession()||state.session)?.expires_at||"");
    const remain=Math.max(0,Math.ceil((until-Date.now())/60000));
    return remain>0?"สิทธิ์บันทึกผลเหลือประมาณ "+(Math.floor(remain/60)?Math.floor(remain/60)+" ชม. ":"")+(remain%60)+" นาที":"";
  }
  function schoolsOptions(selected,allowed){
    const items=state.schools.filter(s=>!allowed?.length||allowed.includes(s.id));
    return "<option value=''>เลือกโรงเรียน</option>"+items.map(s=>"<option value='"+escapeHtml(s.id)+"'"+(s.id===selected?" selected":"")+">"+escapeHtml(s.name)+"</option>").join("");
  }
  function school(id){return state.schools.find(s=>s.id===id)?.short||state.schools.find(s=>s.id===id)?.name||id;}
  function setRowHtml(set,index){
    const a=Number.isInteger(set?.a)?set.a:"";
    const b=Number.isInteger(set?.b)?set.b:"";
    return "<div class='r34-set-row' data-r34-set-row><strong class='r34-set-number'>เซ็ต "+(index+1)+"</strong>"+
      "<label class='r34-field'>"+escapeHtml(school(state.fixture.team_a_id))+
      "<input data-r34-set-score='a' type='number' inputmode='numeric' min='0' max='999' step='1' required placeholder='คะแนน' value='"+a+"'></label>"+
      "<label class='r34-field'>"+escapeHtml(school(state.fixture.team_b_id))+
      "<input data-r34-set-score='b' type='number' inputmode='numeric' min='0' max='999' step='1' required placeholder='คะแนน' value='"+b+"'></label>"+
      "<button type='button' class='r34-remove-set' data-r34-remove-set>ลบเซ็ต</button></div>";
  }
  function resultTypeControls(kind){
    const f=state.fixture,prev=state.approved.get(f.fixture_id)||{};
    if(kind==="win_loss"){
      return "<label class='r34-field'>โรงเรียนที่ชนะ<select name='winner_school_id' required>"+schoolsOptions(prev.winner_school_id,[f.team_a_id,f.team_b_id])+"</select></label>";
    }
    if(kind==="score"){
      const a=Number.isInteger(prev.score_a)?prev.score_a:"";
      const b=Number.isInteger(prev.score_b)?prev.score_b:"";
      return "<div class='r34-two'><label class='r34-field'>"+escapeHtml(school(f.team_a_id))+"<input name='score_a' type='number' min='0' max='9999' step='1' required value='"+a+"'></label><label class='r34-field'>"+escapeHtml(school(f.team_b_id))+"<input name='score_b' type='number' min='0' max='9999' step='1' required value='"+b+"'></label></div>";
    }
    if(kind==="sets"){
      const saved=Array.isArray(prev.sets)&&prev.sets.length?prev.sets.slice(0,7):[{}];
      return "<div class='r34-set-fields'><p class='r34-small'>กรอกคะแนนจริงของแต่ละทีมในแต่ละเซ็ต</p>"+
        "<div id='r34SetRows'>"+saved.map((x,i)=>setRowHtml(x,i)).join("")+"</div>"+
        "<button type='button' class='r34-add-set' id='r34AddSet'>+ เพิ่มเซ็ต</button>"+
        "<p class='r34-small'>บันทึกได้ไม่เกิน 7 เซ็ต และไม่ต้องกรอกเซ็ตที่ยังไม่ได้แข่งขัน</p></div>";
    }
    if(kind==="ranking"){
      const allowed=f.school_ids||[];
      const ranks=Array.isArray(prev.rankings)?prev.rankings:[];
      return "<p class='r34-small'>เลือกโรงเรียนที่มีผลจริง ระบุอันดับและสถิติเท่าที่ทราบ</p>"+
        Array.from({length:8},(_,i)=>{
          const x=ranks[i]||{};
          return "<div class='r34-rank'><span>อันดับ "+(i+1)+"</span><select name='rank-school-"+(i+1)+"'>"+schoolsOptions(x.school_id,allowed)+"</select><input type='text' name='rank-mark-"+(i+1)+"' maxlength='80' placeholder='สถิติ (ถ้ามี)' value='"+escapeHtml(x.mark||"")+"'><input type='text' name='rank-unit-"+(i+1)+"' maxlength='30' placeholder='หน่วย' value='"+escapeHtml(x.unit||"")+"'></div>";
        }).join("");
    }
    return "";
  }
  function drawForm(){
    const f=state.fixture;
    const current=state.approved.get(f.fixture_id);
    const rank=f.kind==="track_event";
    const choices=rank?[["ranking","ผลจัดอันดับ"]]:
      [["win_loss","ชนะ–แพ้"],["score","คะแนน"],["sets","คะแนนรายเซ็ต"]];
    const defaultType=rank?"ranking":(current?.result_type||(["football","futsal","shootout"].includes(f.sport_id)?"score":["volleyball","takraw","tabletennis"].includes(f.sport_id)?"sets":"win_loss"));
    const name=f.kind==="track_event"?"รายการกรีฑา":escapeHtml(school(f.team_a_id))+" พบ "+escapeHtml(school(f.team_b_id));
    const revision=Number(f.base_revision||0);
    overlay.querySelector("#r34Title").textContent=revision?"แก้ไขผลการแข่งขัน":"บันทึกผลการแข่งขัน";
    modalBody.innerHTML="<div class='r34-fixture'><strong>"+name+"</strong><span>"+escapeHtml(state.sports.find(x=>x.id===f.sport_id)?.name||f.sport_id)+" · "+escapeHtml(f.division||"")+"</span></div>"+
      "<p class='r34-small'>"+escapeHtml(displayRemaining())+" <button type='button' class='r34-logout' id='r34Logout'>"+(reviewerSession()?"ปิดหน้าบันทึกผล":"ออกจากโหมดบันทึกผล")+"</button></p>"+
      (f.has_pending?"<p class='r34-pending'>มีข้อมูลรายการนี้ส่งรอตรวจแล้ว จึงยังไม่สามารถส่งซ้ำได้</p>":
      "<form id='r34Form'><details class='r34-optional-type'><summary>รูปแบบบันทึก: "+escapeHtml(choices.find(x=>x[0]===defaultType)?.[1]||"ผลการแข่งขัน")+" (เปลี่ยนได้)</summary>"+
      "<label class='r34-field'>เลือกรูปแบบ<select name='result_type' id='r34ResultType'>"+
      choices.map(x=>"<option value='"+x[0]+"'"+(x[0]===defaultType?" selected":"")+">"+x[1]+"</option>").join("")+"</select></label></details>"+
      "<div id='r34TypeControls'></div>"+
      (revision?"<label class='r34-field'>เหตุผลที่แก้ผลรับรองแล้ว<textarea name='reason' minlength='8' maxlength='500' rows='2' required placeholder='ระบุเหตุผลให้ผู้รับรองตรวจสอบ'></textarea></label>":"")+
      "<p class='r34-small'>กดส่งแล้วข้อมูลจะรอตรวจรับ ไม่เปลี่ยนผลที่เผยแพร่ทันที</p>"+
      "<div class='r34-buttons'><button class='r34-primary' type='submit'>ส่งผลให้ตรวจ</button><button type='button' data-r34-close>ยกเลิก</button></div></form>");
    const form=modalBody.querySelector("#r34Form");
    if(form){
      const controls=modalBody.querySelector("#r34TypeControls");
      function updateSetRows(){
        const rows=Array.from(controls.querySelectorAll("[data-r34-set-row]"));
        rows.forEach((row,i)=>{
          row.querySelector(".r34-set-number").textContent="เซ็ต "+(i+1);
          row.querySelector("[data-r34-remove-set]").hidden=rows.length===1;
        });
        const add=controls.querySelector("#r34AddSet");
        if(add)add.disabled=rows.length>=7;
      }
      const change=()=>{
        const selected=form.elements.result_type.value;
        controls.innerHTML=resultTypeControls(selected);
        const typeLabel=choices.find(x=>x[0]===selected)?.[1]||"ผลการแข่งขัน";
        const heading=form.querySelector(".r34-optional-type>summary");
        heading.textContent="รูปแบบบันทึก: "+typeLabel+" (เปลี่ยนได้)";
        if(selected==="sets")updateSetRows();
      };
      form.elements.result_type.addEventListener("change",change);change();
      controls.addEventListener("click",event=>{
        if(event.target.closest("#r34AddSet")){
          const rows=controls.querySelector("#r34SetRows");
          if(rows&&rows.children.length<7){
            rows.insertAdjacentHTML("beforeend",setRowHtml({},rows.children.length));
            updateSetRows();
          }
        }
        if(event.target.closest("[data-r34-remove-set]")){
          const row=event.target.closest("[data-r34-set-row]");
          if(row&&controls.querySelectorAll("[data-r34-set-row]").length>1){
            row.remove();updateSetRows();
          }
        }
      });
      form.addEventListener("submit",async e=>{
        e.preventDefault();message("กำลังบันทึกผล…");
        const button=form.querySelector("[type=submit]");button.disabled=true;
        const type=form.elements.result_type.value;
        const p={fixture_id:f.fixture_id,base_revision:revision,result_type:type};
        if(type==="win_loss")p.winner_school_id=form.elements.winner_school_id.value;
        if(type==="score") {
          p.score_a=form.elements.score_a.value;p.score_b=form.elements.score_b.value;
        }
        if(type==="sets"){
          const rows=Array.from(controls.querySelectorAll("[data-r34-set-row]"));
          if(!rows.length||rows.length>7){
            message("กรุณาเพิ่มคะแนนอย่างน้อย 1 เซ็ต และไม่เกิน 7 เซ็ต",true);button.disabled=false;return;
          }
          const scores=rows.map(row=>({
            a:row.querySelector("[data-r34-set-score='a']").value.trim(),
            b:row.querySelector("[data-r34-set-score='b']").value.trim()
          }));
          if(scores.some(x=>!/^\d{1,3}$/.test(x.a)||!/^\d{1,3}$/.test(x.b))){
            message("กรุณากรอกคะแนนทั้งสองทีมเป็นตัวเลข 0–999 ในทุกเซ็ต",true);button.disabled=false;return;
          }
          p.sets=scores.map(x=>({a:Number(x.a),b:Number(x.b)}));
        }
        if(type==="ranking"){
          p.rankings=[];
          for(let i=1;i<=8;i++){
            const team=form.elements["rank-school-"+i].value;
            if(!team)continue;
            const mark=form.elements["rank-mark-"+i].value.trim();
            const unit=form.elements["rank-unit-"+i].value.trim();
            p.rankings.push({rank:i,school_id:team,...(mark?{mark}:{}),...(unit?{unit}:{})});
          }
          if(!p.rankings.length){message("กรุณาเลือกโรงเรียนอย่างน้อยหนึ่งอันดับ",true);button.disabled=false;return;}
        }
        if(revision)p.reason=form.elements.reason.value.trim();
        try{
          const ans=await call("submit",p);
          if(!ans.ok){
             if(ans.error==="expired" && reviewerSession()){message("สิทธิ์ผู้ตรวจหมดอายุ กรุณาเข้าหน้ายืนยันผลอีกครั้ง",true);return;}
             if(ans.error==="expired"){clearSession();fillPin();}
             message(explain(ans.error),true);return;
           }
          modalBody.innerHTML="<p class='r34-success'>บันทึกแล้ว · รอตรวจสอบ</p><p>ข้อมูลส่งถึงผู้ตรวจผลแล้ว หน้าเว็บไซต์จะแสดงผลใหม่เมื่อรับรองเรียบร้อย</p><div class='r34-buttons'><button type='button' data-r34-close class='r34-primary'>ปิด</button></div>";
          message("ส่งข้อมูลสำเร็จ");
        }catch(_){message("เชื่อมต่อไม่สำเร็จ ข้อมูลที่กรอกยังอยู่ กรุณาลองใหม่",true);}
        finally{button.disabled=false;}
      });
    }
    modalBody.querySelector("#r34Logout").addEventListener("click",async()=>{
      if(reviewerSession()){close();return;} // Reviewer sign-out stays in the reviewer workspace.
      try{await call("logout");}catch(_){}
      clearSession();fillPin();message("ออกจากโหมดบันทึกผลแล้ว");
    });
  }
  async function loadFixture(){
    message("กำลังเปิดข้อมูลคู่แข่งขัน…");
    const answer=await call("fixture",{fixture_id:state.active});
    if(!answer.ok){
      if(answer.error==="expired"&&!reviewerSession()){clearSession();fillPin();}
      message(explain(answer.error),true);return;
    }
    state.fixture=answer;drawForm();message("");
  }
  async function openEditor(id){
    if(!id||state.active===id&&!overlay.hidden)return;
    state.active=id;open();modalBody.textContent="กำลังตรวจสิทธิ์…";
    await ensureUnlock();
  }
  function annotate(){
    document.querySelectorAll("[data-fixture-card],[data-result-card]").forEach(card=>{
      const id=card.dataset.fixtureCard || (card.dataset.resultCard||"").replace(/^result-/,"");
      if(!id)return;
      if(!card.querySelector(".r34-card-actions")){
        const wrap=document.createElement("div");wrap.className="r34-card-actions";
        const btn=document.createElement("button");btn.type="button";btn.className="r34-edit-button";
        btn.dataset.r34Edit=id;btn.textContent="✎ บันทึกผล";
        wrap.appendChild(btn);card.appendChild(wrap);
        card.tabIndex=0;card.classList.add("r34-editable-card");
      }
      const result=state.approved.get(id);
      const btn=card.querySelector(".r34-edit-button");
      if(result && btn && btn.textContent!=="✎ แก้ไขผล")btn.textContent="✎ แก้ไขผล";
      if(card.hasAttribute("data-fixture-card")){
        let label=card.querySelector(".r34-approved-label");
        if(result && !label){
          label=document.createElement("p");label.className="r34-approved-label";
          const line=card.querySelector(".fixture-source-actions")||card.querySelector(".source-details");
          (line?.parentElement||card).insertBefore(label,line||null);
        }
        if(label && result){
          const winner=result.winner_school_id?" · ผู้ชนะ: "+school(result.winner_school_id):
            result.result_type==="score"?" · มีคะแนนรับรองแล้ว":"";
          const approvedText="แข่งแล้ว · ผลรับรองแล้ว"+winner;
          if(label.textContent!==approvedText)label.textContent=approvedText;
        }else if(label)label.remove();
      }
    });
  }
  document.addEventListener("click",(e)=>{
    if(!overlay.hidden && e.target.closest("#r34Overlay"))return;
    const button=e.target.closest("[data-r34-edit]");
    if(button){e.preventDefault();e.stopPropagation();openEditor(button.dataset.r34Edit);return;}
    if(e.target.closest("button,a,summary,details,input,select,textarea,label"))return;
    const card=e.target.closest("[data-fixture-card],[data-result-card]");
    if(card){const id=card.dataset.fixtureCard || card.dataset.resultCard.replace(/^result-/,"");openEditor(id);}
  },true);
  document.addEventListener("keydown",(e)=>{
    if(e.key!=="Enter"&&e.key!==" ")return;
    if(e.target.matches("[data-fixture-card],[data-result-card]")){
      e.preventDefault();const id=e.target.dataset.fixtureCard||(e.target.dataset.resultCard||"").replace(/^result-/,"");openEditor(id);
    }
  });
  const targets=["cards","sharedFixtureCard","resultsList","sharedResultCard"];
  const observer=new MutationObserver(()=>{annotate();});
  for(const id of targets){
    const el=document.getElementById(id);
    if(el)observer.observe(el,{childList:true,subtree:true});
  }
  async function refreshApproved(){
    if(state.refreshing)return;
    state.refreshing=true;
    try{
      const res=await root.NongkumResultSource.load();
      if(!res?.data?.results)return;
      state.approved=new Map(res.data.results.filter(r=>r.status==="approved").map(r=>[r.fixture_id||r.event_id,r]));
      state.schools=res.data.schools||[];
      state.sports=res.data.sports||[];
      state.source=res.source;
      annotate();
    }catch(_){ /* Never replace an approved result with a guessed score. */ }
    finally{state.refreshing=false;}
  }
  annotate();refreshApproved();
  document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="visible")refreshApproved();});
  root.setInterval?.(()=>{if(document.visibilityState==="visible")refreshApproved();},120000);
})(globalThis);
