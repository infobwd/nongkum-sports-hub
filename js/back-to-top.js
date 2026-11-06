/* Shared back-to-top control for all Nongkum Sports Hub pages. */
(()=>{
 "use strict";
 if(document.getElementById("sharedBackTop"))return;
 const button=document.createElement("button");button.id="sharedBackTop";button.className="shared-back-top";button.type="button";button.hidden=true;button.setAttribute("aria-label","กลับขึ้นด้านบน");button.title="กลับขึ้นด้านบน";
 button.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 19V5M5 12l7-7 7 7"/></svg>';
 document.body.appendChild(button);
 const nav=document.querySelector(".mobile-nav");
 function update(){button.hidden=(window.scrollY||document.documentElement.scrollTop||0)<300;let bottom=20;
  if(nav&&getComputedStyle(nav).display!=="none"){const r=nav.getBoundingClientRect();if(r.width>0&&r.height>0&&r.top<window.innerHeight&&r.bottom>0)bottom=Math.max(20,window.innerHeight-r.top+12);}
  // The visible navigation bar already includes any safe-area padding.
  button.style.bottom=nav&&bottom>20?bottom+"px":"calc(20px + env(safe-area-inset-bottom,0px))";
 }
 button.addEventListener("click",()=>window.scrollTo({top:0,behavior:window.matchMedia("(prefers-reduced-motion: reduce)").matches?"auto":"smooth"}));
 window.addEventListener("scroll",update,{passive:true});window.addEventListener("resize",update,{passive:true});window.addEventListener("pageshow",update);update();
})();
