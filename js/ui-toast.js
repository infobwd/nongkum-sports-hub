/* R13: common accessible copy/share feedback, using existing review toast styling. */
(function(root){
  "use strict";
  let timer=null;
  const $=id=>document.getElementById(id);
  function show(title,detail,failed=false){
    const toast=$("reviewToast");
    if(!toast)return false;
    $("reviewToastTitle").textContent=title;
    $("reviewToastDetail").textContent=detail||"";
    $("reviewToastIcon").textContent=failed?"!":"✓";
    toast.classList.toggle("is-error",!!failed);
    toast.hidden=false;
    if(timer!==null)clearTimeout(timer);
    timer=setTimeout(()=>{toast.hidden=true;timer=null;},4000);
    return true;
  }
  const close=$("reviewToastClose");
  if(close)close.addEventListener("click",()=>{
    $("reviewToast").hidden=true;
    if(timer!==null){clearTimeout(timer);timer=null;}
  });
  root.NongkumToast=Object.freeze({show});
})(globalThis);
