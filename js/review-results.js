/* R37: review-only workspace. Public results remain approved-only. */
(function(){
"use strict";
const API="https://zprxvpfkvforoxrboqiv.supabase.co/functions/v1/nongkum-results-reviewer";
const STORAGE="nongkum-r37-reviewer-session-v1";
const el=id=>document.getElementById(id);
const dom={login:el("reviewerUnlock"),workspace:el("reviewerWorkspace"),form:el("reviewerLoginForm"),loginButton:el("reviewerLoginButton"),status:el("reviewerStatus"),queue:el("reviewerQueue"),empty:el("reviewerEmpty"),session:el("reviewerSessionInfo"),refresh:el("reviewerRefresh"),logout:el("reviewerLogout"),sport:el("reviewerSport"),pending:el("reviewerPendingCount"),approved:el("reviewerApprovedCount"),returned:el("reviewerReturnedCount")};
if(!dom.form)return;
let state={session:null,items:[],schools:{},sports:{},busy:false,loading:false,filter:""};
const esc=x=>String(x===undefined||x===null?"":x).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const messages={wrong_pin:"รหัสผู้ตรวจไม่ถูกต้อง",limited:"ลองรหัสผิดหลายครั้ง กรุณารอสักครู่",expired:"หมดเวลาใช้งาน กรุณาเข้าระบบใหม่",setup_required:"ยังไม่ได้เปิดใช้งานรหัสผู้ตรวจ โปรดติดต่อผู้ดูแล",invalid:"กรุณาตรวจข้อมูลอีกครั้ง",stale:"ข้อมูลรายการนี้มีการเปลี่ยนแปลง กรุณารีเฟรช",missing:"ไม่พบรายการที่รอตรวจ",source_changed:"รายการแข่งขันมีข้อมูลเปลี่ยนไป กรุณาติดต่อผู้จัด",reason_required:"กรุณาระบุเหตุผลอย่างน้อย 8 ตัวอักษร",cannot_approve:"ยังยืนยันผลไม่ได้ กรุณาตรวจข้อมูลหรือแจ้งผู้จัด",unavailable:"ไม่สามารถเชื่อมต่อระบบได้",forbidden:"ไม่มีสิทธิ์เข้าใช้งาน",network:"เครือข่ายขัดข้อง กรุณาลองใหม่"};
function notice(s,bad=false){dom.status.textContent=s||"";dom.status.dataset.error=bad?"true":"false";}
function fmt(d){const x=new Date(d||"");return Number.isFinite(x.getTime())?new Intl.DateTimeFormat("th-TH",{timeZone:"Asia/Bangkok",day:"numeric",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit",hourCycle:"h23"}).format(x)+" น.":"ไม่ระบุเวลา";}
function loginView(){dom.login.hidden=false;dom.workspace.hidden=true;}
function workView(){dom.login.hidden=true;dom.workspace.hidden=false;dom.session.textContent="ผู้ตรวจ: "+(state.session?.reviewer_name||"")+" · ใช้งานได้ถึง "+fmt(state.session?.expires_at);}
function clearSession(){state.session=null;try{localStorage.removeItem(STORAGE);}catch(_){}loginView();}
function saveSession(){try{localStorage.setItem(STORAGE,JSON.stringify(state.session));}catch(_){}}
function restoreSession(){try{const t=JSON.parse(localStorage.getItem(STORAGE)||"null");if(t&&/^[0-9a-f]{64}$/.test(t.token||"")&&Date.parse(t.expires_at)>Date.now())state.session=t;}catch(_){}}
async function request(action,payload={}){
 const headers={"Content-Type":"application/json","Accept":"application/json"};
 if(action!=="unlock"&&state.session?.token)headers.Authorization="Bearer "+state.session.token;
 const res=await fetch(API,{method:"POST",headers,body:JSON.stringify({action,...payload}),cache:"no-store"});
 let ans;try{ans=await res.json();}catch(_){throw Error("network");}
 if(!ans||typeof ans.ok!=="boolean")throw Error("network");
 return ans;
}
function fail(a){if(a.error==="expired"){clearSession();}notice(messages[a.error]||messages.unavailable,true);}
function school(id){return state.schools[id]||id||"ไม่ระบุ";}
function resultHtml(item){
 const r=item.proposed||{},a=school(item.team_a_id),b=school(item.team_b_id);
 if(item.result_type==="win_loss")return "<p>ผู้ชนะ: <strong>"+esc(school(r.winner_school_id))+"</strong></p>";
 if(item.result_type==="score")return "<p>"+esc(a)+" <strong>"+esc(r.score_a)+" – "+esc(r.score_b)+"</strong> "+esc(b)+"</p>";
 if(item.result_type==="sets")return "<p>"+esc(a)+" / "+esc(b)+"</p><ul>"+(Array.isArray(r.sets)?r.sets:[]).slice(0,7).map((s,i)=>"<li>เซ็ต "+(i+1)+": "+esc(s.a)+" – "+esc(s.b)+"</li>").join("")+"</ul>";
 if(item.result_type==="ranking")return "<ul>"+(Array.isArray(r.rankings)?r.rankings:[]).slice(0,30).map(x=>"<li>อันดับ "+esc(x.rank)+" · "+esc(school(x.school_id))+(x.mark?" · "+esc(x.mark):"")+(x.unit?" "+esc(x.unit):"")+"</li>").join("")+"</ul>";
 return "<p>กรุณาตรวจผลกับหลักฐานต้นฉบับ</p>";
}
function renderCard(item){
 const id=esc(item.id),current=Number(item.published_revision||0)>0;
 const title=item.kind==="track_event"?"กรีฑา · "+(item.source_match_no||item.event_id||"รายการ"):(school(item.team_a_id)+" พบ "+school(item.team_b_id));
 const source=item.source_current?"":"<p class='reviewer-source-warning'>ข้อมูลรายการนี้ไม่ตรงกับตารางที่ใช้งาน ไม่สามารถกดยืนยันได้</p>";
 const correction=Number(item.revision)>1?
   "<label for='correction-"+id+"'>เหตุผลการแก้ไข (ต้องระบุสำหรับผลฉบับใหม่)</label><textarea class='reviewer-reject-reason' id='correction-"+id+"' data-correction placeholder='กรอกเหตุผลอย่างน้อย 8 ตัวอักษร'>"+esc(item.correction_note||"")+"</textarea>":"";
 return "<article class='reviewer-card' data-submission='"+id+"'><div class='reviewer-card-head'><h3>"+esc(state.sports[item.sport_id]||item.sport_id)+" · "+esc(item.division||"")+"</h3><span class='reviewer-pill'>รอยืนยัน</span></div>"+
 "<p class='reviewer-teams'>"+esc(title)+"</p><p class='reviewer-meta'>รหัสรายการ: "+esc(item.fixture_id||item.event_id)+"<br>ส่งเมื่อ: "+esc(fmt(item.submitted_at))+"<br>ผู้ส่ง: "+esc(item.submitted_by||"ไม่ระบุ")+"<br>ฉบับที่ "+esc(item.revision)+"</p>"+
 (current?"<p class='reviewer-previous'>เป็นคำขอแก้ไขผลที่เผยแพร่แล้ว ฉบับที่ "+esc(item.published_revision)+" จะแสดงต่อไปจนกว่าจะยืนยันใหม่</p>":"")+
 "<div class='reviewer-result'><h4>ผลที่ส่งมา</h4>"+resultHtml(item)+"</div>"+source+
 "<div class='reviewer-actions'><button type='button' class='reviewer-primary' data-action='approve' "+(!item.source_current?"disabled":"")+">ยืนยันและเผยแพร่</button><button type='button' data-action='return'>ส่งกลับแก้ไข</button></div>"+
 "<div class='reviewer-return-panel' data-return-panel hidden><label for='return-"+id+"'>เหตุผลที่ส่งกลับ</label><textarea class='reviewer-reject-reason' data-return-reason id='return-"+id+"' minlength='8' maxlength='500' placeholder='เช่น คะแนนยังไม่ตรงกับใบลงผล กรุณาตรวจใหม่'></textarea><div class='reviewer-actions'><button type='button' data-action='cancel-return'>ยกเลิก</button><button type='button' data-action='confirm-return'>ยืนยันการส่งกลับ</button></div></div>"+
 "<div class='reviewer-return-panel' data-confirm-panel hidden><p>โปรดตรวจผลกับเอกสารก่อนยืนยัน เมื่อกดแล้วจะแสดงในเว็บไซต์สาธารณะ</p>"+correction+"<div class='reviewer-actions'><button type='button' data-action='cancel-approve'>ยกเลิก</button><button type='button' class='reviewer-primary' data-action='confirm-approve'>ยืนยันการเผยแพร่</button></div></div></article>";
}
function render(){
 const items=state.items.filter(x=>!state.filter||x.sport_id===state.filter);
 dom.queue.innerHTML=items.map(renderCard).join("");
 dom.empty.hidden=items.length!==0;
 const opts=Object.entries(state.sports).filter(([id])=>state.items.some(x=>x.sport_id===id));
 dom.sport.innerHTML="<option value=''>ทุกกีฬา</option>"+opts.map(([id,name])=>"<option value='"+esc(id)+"'"+(state.filter===id?" selected":"")+">"+esc(name)+"</option>").join("");
}
async function loadQueue(silent=false){
 if(!state.session||state.loading||state.busy||document.visibilityState==="hidden")return;
 state.loading=true;dom.queue.setAttribute("aria-busy","true");
 if(!silent)notice("กำลังโหลดรายการที่รอตรวจ…");
 try{
  const ans=await request("queue");
  if(!ans.ok){fail(ans);return;}
  state.items=Array.isArray(ans.items)?ans.items:[];
  state.schools=ans.schools||{};state.sports=ans.sports||{};
  dom.pending.textContent=String(ans.counts?.review??state.items.length);
  dom.approved.textContent=String(ans.counts?.approved??0);
  dom.returned.textContent=String(ans.counts?.rejected??0);
  render();if(!silent)notice("อัปเดตข้อมูลเมื่อ "+fmt(new Date().toISOString()));
 }catch(e){if(!silent)notice(messages[e.message]||messages.network,true);}
 finally{state.loading=false;dom.queue.setAttribute("aria-busy","false");}
}
dom.form.addEventListener("submit",async e=>{
 e.preventDefault();
 const name=dom.form.elements.reviewer_name.value.trim(),pin=dom.form.elements.pin.value.trim();
 if(name.length<2||!(/^\d{8,30}$/.test(pin))){notice("กรุณาระบุชื่อและรหัสผู้ตรวจให้ถูกต้อง",true);return;}
 dom.loginButton.disabled=true;notice("กำลังตรวจสิทธิ์…");
 try{
  const ans=await request("unlock",{reviewer_name:name,pin});
  if(!ans.ok){fail(ans);return;}
  state.session={token:ans.token,expires_at:ans.expires_at,reviewer_name:ans.reviewer_name};
  saveSession();dom.form.elements.pin.value="";workView();await loadQueue();
 }catch(e){notice(messages[e.message]||messages.network,true);}
 finally{dom.loginButton.disabled=false;}
});
dom.sport.addEventListener("change",()=>{state.filter=dom.sport.value;render();});
dom.refresh.addEventListener("click",()=>loadQueue());
dom.logout.addEventListener("click",async()=>{
 try{if(state.session)await request("logout");}catch(_){}clearSession();notice("ออกจากระบบแล้ว");
});
dom.queue.addEventListener("click",async e=>{
 const button=e.target.closest("button[data-action]"),card=button?.closest("[data-submission]");
 if(!button||!card||state.busy)return;
 const action=button.dataset.action,panelReturn=card.querySelector("[data-return-panel]"),panelConfirm=card.querySelector("[data-confirm-panel]");
 if(action==="approve"){panelReturn.hidden=true;panelConfirm.hidden=false;return;}
 if(action==="return"){panelConfirm.hidden=true;panelReturn.hidden=false;return;}
 if(action==="cancel-return"){panelReturn.hidden=true;return;}
 if(action==="cancel-approve"){panelConfirm.hidden=true;return;}
 const item=state.items.find(x=>x.id===card.dataset.submission);if(!item)return;
 const args={submission_id:item.id,expected_revision:item.revision};
 if(action==="confirm-return"){
  args.reason=panelReturn.querySelector("[data-return-reason]").value.trim();
  if(args.reason.length<8){notice(messages.reason_required,true);return;}
 }else if(action==="confirm-approve"){
  if(Number(item.revision)>1){args.correction_note=panelConfirm.querySelector("[data-correction]").value.trim();if(args.correction_note.length<8){notice(messages.reason_required,true);return;}}
 }else return;
 state.busy=true;card.querySelectorAll("button").forEach(x=>x.disabled=true);
 notice(action==="confirm-approve"?"กำลังยืนยันและเผยแพร่…":"กำลังส่งกลับแก้ไข…");
 try{
  const ans=await request(action==="confirm-approve"?"approve":"reject",args);
  if(!ans.ok){fail(ans);return;}
  notice(action==="confirm-approve"?"ยืนยันและเผยแพร่แล้ว":"ส่งกลับให้แก้ไขแล้ว");
  state.busy=false;
  await loadQueue(true);
 }catch(e){notice(messages[e.message]||messages.network,true);}
 finally{state.busy=false;card.querySelectorAll("button").forEach(x=>x.disabled=false);}
});
restoreSession();
if(state.session){
 workView();
 request("status").then(a=>{
  if(!a.ok){fail(a);return;}
  state.session.expires_at=a.expires_at;saveSession();workView();loadQueue();
 }).catch(()=>{notice(messages.network,true);});
}else loginView();
setInterval(()=>{if(state.session&&document.visibilityState==="visible")loadQueue(true);},30000);
document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="visible"&&state.session)loadQueue(true);});
})(globalThis);
