/* R19-F/UX-2: touch pull-to-refresh + back-to-top, isolated from committee data logic. */
(()=>{
  "use strict";
  const hint=document.getElementById("committeePullHint");
  const label=document.getElementById("committeePullText");
  const notice=document.getElementById("committeeRefreshNotice");
  if(!hint||!label||!notice)return;
  const header=document.querySelector("header.top");
  const positionHint=()=>{
    const headerBottom=header?.getBoundingClientRect().bottom||0;
    const safeTop=Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--safe-top"))||0;
    const y=Math.max(12+safeTop,headerBottom+10);
    hint.style.setProperty("--committee-hint-top",Math.round(y)+"px");
  };
  positionHint();
  window.addEventListener("resize",positionHint,{passive:true});
  window.addEventListener("scroll",positionHint,{passive:true});
  if(header&&typeof ResizeObserver!=="undefined")new ResizeObserver(positionHint).observe(header);
  let startX=0,startY=0,distance=0,armed=false,busy=false;
  const threshold=85;
  const reset=()=>{armed=false;distance=0;hint.classList.remove("visible","ready");};
  let hideNotice;
  function positionNotice(){
    const topButton=document.getElementById("sharedBackTop");
    const visible=topButton&&!topButton.hidden&&getComputedStyle(topButton).display!=="none";
    notice.classList.toggle("with-back-top",Boolean(visible));
  }
  function showNotice(message){
    notice.textContent=message;positionNotice();notice.hidden=false;
    clearTimeout(hideNotice);hideNotice=setTimeout(()=>{notice.hidden=true;notice.classList.remove("with-back-top");},2000);
  }
  window.addEventListener("scroll",()=>{if(!notice.hidden)positionNotice();},{passive:true});
  window.addEventListener("resize",()=>{if(!notice.hidden)positionNotice();},{passive:true});
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
    positionHint();hint.classList.add("visible");hint.classList.toggle("ready",distance>=threshold);
    label.textContent=distance>=threshold?"ปล่อยเพื่อรีเฟรชข้อมูล":"ดึงลงเพื่อรีเฟรช";
    if(event.cancelable)event.preventDefault();
  },{passive:false});
  document.addEventListener("touchend",async()=>{
    if(!armed)return;
    const ready=distance>=threshold;reset();if(!ready||busy)return;
    const api=window.NongkumCommitteeRefresh;
    if(!api||typeof api.refresh!=="function"){showNotice("ยังไม่พร้อมโหลดข้อมูล กรุณาลองอีกครั้ง");return;}
    busy=true;positionHint();hint.classList.add("visible","ready");label.textContent="กำลังโหลดข้อมูลล่าสุด…";
    try{const ok=await api.refresh();showNotice(ok?"อัปเดตข้อมูลล่าสุดแล้ว":"โหลดข้อมูลไม่สำเร็จ กรุณาลองใหม่");}
    catch(_){showNotice("โหลดข้อมูลไม่สำเร็จ กรุณาลองใหม่");}
    finally{busy=false;reset();}
  },{passive:true});
  document.addEventListener("touchcancel",reset,{passive:true});
  window.addEventListener("pagehide",reset);
})();
