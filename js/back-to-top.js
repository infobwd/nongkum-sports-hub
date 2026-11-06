/* Shared back-to-top control; R22 also handles review's independent desktop list scroll. */
(()=>{
 "use strict";
 if(document.getElementById("sharedBackTop"))return;
 const button=document.createElement("button");
 button.id="sharedBackTop";button.className="shared-back-top";button.type="button";button.hidden=true;
 button.setAttribute("aria-label","กลับขึ้นด้านบน");button.title="กลับขึ้นด้านบน";
 button.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 19V5M5 12l7-7 7 7"/></svg>';
 document.body.appendChild(button);
 const nav=document.querySelector(".mobile-nav");
 const isReview=document.body.dataset.view==="review";
 const reviewMain=isReview?document.getElementById("reviewMain"):null;
 function pdfOpen(){return isReview&&document.body.classList.contains("review-pdf-open");}
 function splitReview(){return pdfOpen()&&window.matchMedia("(min-width:1001px)").matches;}
 function update(){
  const split=splitReview();
  const modal=pdfOpen()&&!split;
  const scrolled=split?(reviewMain?.scrollTop||0):(window.scrollY||document.documentElement.scrollTop||0);
  button.hidden=modal||scrolled<300;
  let bottom=20;
  if(nav&&getComputedStyle(nav).display!=="none"){
   const r=nav.getBoundingClientRect();
   if(r.width>0&&r.height>0&&r.top<window.innerHeight&&r.bottom>0)bottom=Math.max(20,window.innerHeight-r.top+12);
  }
  // The visible navigation bar already includes any safe-area padding.
  button.style.bottom=nav&&bottom>20?bottom+"px":"calc(20px + env(safe-area-inset-bottom,0px))";
 }
 button.addEventListener("click",()=>{
  const behavior=window.matchMedia("(prefers-reduced-motion: reduce)").matches?"auto":"smooth";
  if(splitReview()&&reviewMain){
   if(typeof reviewMain.scrollTo==="function")reviewMain.scrollTo({top:0,behavior});
   else reviewMain.scrollTop=0;
  }else if(!pdfOpen())window.scrollTo({top:0,behavior});
 });
 window.addEventListener("scroll",update,{passive:true});
 if(reviewMain)reviewMain.addEventListener("scroll",update,{passive:true});
 window.addEventListener("resize",update,{passive:true});
 window.addEventListener("pageshow",update);
 if(isReview)window.NongkumBackTopUpdate=update;
 update();
})();
