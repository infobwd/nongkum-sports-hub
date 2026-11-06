/* Shared gesture for program/results/standings; committee retains its established handler. */
(()=>{
"use strict";
const hint=document.createElement("div"),toast=document.createElement("div");
hint.className="shared-pull-hint";hint.setAttribute("role","status");hint.setAttribute("aria-live","polite");hint.textContent="↓ ดึงลงเพื่อรีเฟรช";
toast.className="shared-pull-toast";toast.setAttribute("role","status");toast.setAttribute("aria-live","polite");toast.hidden=true;document.body.append(hint,toast);
let active=false,busy=false,startX=0,startY=0,distance=0,noticeTimer;const threshold=85;
const header=document.querySelector("header.top");
function position(){const bottom=header?.getBoundingClientRect().bottom||0;hint.style.setProperty("--shared-pull-top",Math.round(Math.max(12,bottom+10))+"px");}
function reset(){active=false;distance=0;hint.classList.remove("visible","ready");}
function notify(message){toast.textContent=message;const btn=document.getElementById("sharedBackTop");toast.classList.toggle("with-back-top",Boolean(btn&&!btn.hidden));toast.hidden=false;clearTimeout(noticeTimer);noticeTimer=setTimeout(()=>{toast.hidden=true;},2000);}
position();window.addEventListener("resize",position,{passive:true});window.addEventListener("scroll",()=>{position();if(!toast.hidden){const btn=document.getElementById("sharedBackTop");toast.classList.toggle("with-back-top",Boolean(btn&&!btn.hidden));}},{passive:true});if(header&&typeof ResizeObserver!=="undefined")new ResizeObserver(position).observe(header);
document.addEventListener("touchstart",e=>{if(busy||e.touches.length!==1||window.scrollY>2||e.target.closest("input,textarea,select,button,a,summary,details,[role=dialog],nav"))return;startX=e.touches[0].clientX;startY=e.touches[0].clientY;active=true;distance=0;},{passive:true});
document.addEventListener("touchmove",e=>{if(!active||busy||e.touches.length!==1)return;const dx=e.touches[0].clientX-startX,dy=e.touches[0].clientY-startY;if(dy<0||Math.abs(dx)>Math.abs(dy)*.65||window.scrollY>2){reset();return;}if(dy<14)return;distance=Math.min(122,dy*.67);position();hint.classList.add("visible");hint.classList.toggle("ready",distance>=threshold);hint.textContent=distance>=threshold?"↓ ปล่อยเพื่อรีเฟรช":"↓ ดึงลงเพื่อรีเฟรช";if(e.cancelable)e.preventDefault();},{passive:false});
document.addEventListener("touchend",async()=>{if(!active)return;const ready=distance>=threshold;reset();if(!ready||busy)return;const refresh=window.NongkumPageRefresh;if(typeof refresh!=="function"){notify("ยังไม่พร้อมรีเฟรช กรุณาลองใหม่");return;}busy=true;position();hint.classList.add("visible","ready");hint.textContent="กำลังโหลดข้อมูลล่าสุด…";try{const ok=await refresh();notify(ok===true?"อัปเดตข้อมูลล่าสุดแล้ว":"โหลดข้อมูลไม่สำเร็จ กรุณาลองใหม่");}catch(_){notify("โหลดข้อมูลไม่สำเร็จ กรุณาลองใหม่");}finally{busy=false;reset();}},{passive:true});document.addEventListener("touchcancel",reset,{passive:true});window.addEventListener("pagehide",reset);
})();
