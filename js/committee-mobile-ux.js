/* R19-F/UX-2: touch pull-to-refresh + back-to-top, isolated from committee data logic. */
(()=>{
  "use strict";
  const hint=document.getElementById("committeePullHint");
  const label=document.getElementById("committeePullText");
  const top=document.getElementById("committeeBackTop");
  const notice=document.getElementById("committeeRefreshNotice");
  if(!hint||!label||!top||!notice)return;
  let startX=0,startY=0,distance=0,armed=false,busy=false;
  const threshold=85;
  const reset=()=>{armed=false;distance=0;hint.classList.remove("visible","ready");};
  const updateTop=()=>{top.hidden=window.scrollY<350;};
  window.addEventListener("scroll",updateTop,{passive:true});
  updateTop();
  top.addEventListener("click",()=>window.scrollTo({top:0,behavior:window.matchMedia("(prefers-reduced-motion: reduce)").matches?"instant":"smooth"}));
  let hideNotice;
  function showNotice(message){notice.textContent=message;notice.hidden=false;clearTimeout(hideNotice);hideNotice=setTimeout(()=>{notice.hidden=true;},3200);}
  document.addEventListener("touchstart",event=>{
    if(busy||event.touches.length!==1||window.scrollY>2)return;
    if(event.target.closest("input,textarea,select,button,a,summary,details,[role=dialog],.committee-views"))return;
    startX=event.touches[0].clientX;startY=event.touches[0].clientY;armed=true;distance=0;
  },{passive:true});
  document.addEventListener("touchmove",event=>{
    if(!armed||busy||event.touches.length!==1)return;
    const dx=event.touches[0].clientX-startX,dy=event.touches[0].clientY-startY;
    if(dy<0||Math.abs(dx)>Math.abs(dy)*.65||window.scrollY>2){reset();return;}
    if(dy<14)return;
    distance=Math.min(dy*.67,122);
    hint.classList.add("visible");hint.classList.toggle("ready",distance>=threshold);
    label.textContent=distance>=threshold?"ปล่อยเพื่อรีเฟรชข้อมูล":"ดึงลงเพื่อรีเฟรช";
    if(event.cancelable)event.preventDefault();
  },{passive:false});
  document.addEventListener("touchend",async()=>{
    if(!armed)return;
    const ready=distance>=threshold;reset();if(!ready||busy)return;
    const api=window.NongkumCommitteeRefresh;
    if(!api||typeof api.refresh!=="function"){showNotice("ยังไม่พร้อมโหลดข้อมูล กรุณาลองอีกครั้ง");return;}
    busy=true;hint.classList.add("visible","ready");label.textContent="กำลังโหลดข้อมูลล่าสุด…";
    try{const ok=await api.refresh();showNotice(ok?"อัปเดตข้อมูลล่าสุดแล้ว":"โหลดข้อมูลไม่สำเร็จ กรุณาลองใหม่");}
    catch(_){showNotice("โหลดข้อมูลไม่สำเร็จ กรุณาลองใหม่");}
    finally{busy=false;reset();}
  },{passive:true});
  document.addEventListener("touchcancel",reset,{passive:true});
  window.addEventListener("pagehide",reset);
})();
