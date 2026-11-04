/* R6 shared two-view navigation: native anchors remain usable without JavaScript.
   This module only primes filter links and provides immediate tap feedback. */
(function(root){
  "use strict";
  if(typeof document==="undefined"||typeof document.querySelectorAll!=="function")return;
  const links=Array.from(document.querySelectorAll("[data-nav-view]"));
  const notice=document.getElementById("navigationNotice");
  if(!links.length)return;
  const current=document.body&&document.body.dataset?document.body.dataset.view:"";
  function update(filters){
    const state=filters||{};
    links.forEach(function(link){
      const target=link.dataset&&link.dataset.navView;
      if(target!=="program"&&target!=="results")return;
      link.href=root.Nongkum.href(target==="program"?"index.html":"results.html",state);
    });
  }
  const params=new URLSearchParams(location.search);
  const hasDirectLink=params.has("fixture")||params.has("result");
  // The target page revalidates IDs against published data. Initial URLs carry
  // only known filter keys; never leak raw search text or personal information.
  update({
    school:hasDirectLink?"":params.get("school")||root.Nongkum.schoolInStore(),
    sport:params.get("sport")||"",
    level:params.get("level")||""
  });
  let pending=false;
  function reset(){
    pending=false;
    if(document.body&&document.body.dataset)delete document.body.dataset.navTransition;
    links.forEach(function(a){a.classList.remove("is-activating","is-pressing");});
    if(notice)notice.textContent="";
  }
  links.forEach(function(a){
    a.addEventListener("pointerdown",function(event){
      if(event.button!==undefined&&event.button!==0)return;
      a.classList.add("is-pressing");
    },{passive:true});
    a.addEventListener("pointercancel",function(){a.classList.remove("is-pressing");});
    a.addEventListener("pointerleave",function(){a.classList.remove("is-pressing");});
    a.addEventListener("click",function(event){
      const target=a.dataset.navView;
      if(target===current){
        event.preventDefault();
        reset();
        if(typeof window!=="undefined"&&typeof window.scrollTo==="function"){
          window.scrollTo({top:0,behavior:"smooth"});
        }
        return;
      }
      // Do not prevent native navigation or await a fetch; a single tap should
      // start browser navigation. In-flight feedback covers page load latency.
      pending=true;
      a.classList.remove("is-pressing");
      a.classList.add("is-activating");
      if(document.body&&document.body.dataset)document.body.dataset.navTransition=target;
      if(notice)notice.textContent=target==="results"?"กำลังเปิดผลการแข่งขัน":"กำลังเปิดโปรแกรมการแข่งขัน";
    });
  });
  if(typeof window!=="undefined"&&typeof window.addEventListener==="function"){
    window.addEventListener("pageshow",reset);
    // Native viewport-fit Safe Area in shared CSS handles iOS status-bar spacing.
    // Do not create scroll-triggered overlays or intercept native page scrolling.
  }
  root.NongkumNavigation=Object.freeze({update,reset});
})(globalThis);
