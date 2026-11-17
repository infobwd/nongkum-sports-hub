/* R49: LINE share preview and native-share/clipboard controls.
 * The UI receives only the approved-only standings view. Never writes results.
 */
(function(root){
  "use strict";
  function init(config){
    const $=id=>document.getElementById(id);
    const el={
      all:$("shareStandingsAll"),dialog:$("standingsShareDialog"),close:$("standingsShareClose"),
      preview:$("standingsSharePreview"),summary:$("standingsShareSummary"),
      part:$("standingsSharePartLabel"),prev:$("standingsSharePrev"),next:$("standingsShareNext"),
      native:$("standingsShareNative"),copy:$("standingsShareCopy"),
      status:$("standingsShareStatus"),roster:$("standingsRoster")
    };
    const lib=root.NongkumStandingsShare;
    if(!lib||!el.all||!el.dialog||!el.roster)return null;
    let payload=null,at=0;
    function context(){return config.getContext();}
    function eligibleGroups(){
      const c=context();
      if(!c?.data)return [];
      return c.groups.map(g=>{
        const snapshot=c.snapshot?.standings?.find(s=>s.sport_id===g.sport_id&&s.division===g.division);
        return snapshot?.ranking_status==="final"
          ?{...g,rows:snapshot.rows,finalVerified:true,provisional:false}
          :g;
      }).filter(lib.eligible);
    }
    function sync(){el.all.disabled=eligibleGroups().length===0;}
    function renderPart(){
      if(!payload||!payload.parts.length)return;
      el.preview.value=payload.parts[at];
      el.part.textContent="ตอนที่ "+(at+1)+"/"+payload.parts.length;
      el.prev.disabled=at===0;el.next.disabled=at===payload.parts.length-1;
      el.summary.textContent=payload.count+" ตารางอันดับที่มีผลรับรอง"+
        (payload.parts.length>1?" · กรุณาแชร์ให้ครบ "+payload.parts.length+" ตอน":"");
    }
    function close(){
      if(typeof el.dialog.close==="function"&&el.dialog.open)el.dialog.close();
      else if(el.dialog.removeAttribute)el.dialog.removeAttribute("open");
      payload=null;at=0;
    }
    function open(scope){
      const c=context();
      if(!c?.data)return false;
      const groups=eligibleGroups().filter(g=>scope==="x"||lib.groupCode(g)===scope);
      if(!groups.length)return false;
      try{
        const next=lib.makeParts({
          data:c.data,groups,scope,filters:c.filters,
          source:c.source,baseHref:location.href
        });
        if(!next.parts.length)return false;
        payload=next;at=0;el.status.textContent="";
        renderPart();
        if(typeof el.dialog.showModal==="function")el.dialog.showModal();
        else el.dialog.setAttribute("open","");
        return true;
      }catch(error){
        el.status.textContent="ไม่สามารถเตรียมข้อความได้ โปรดรีเฟรชข้อมูลแล้วลองอีกครั้ง";
        console.error(error);
        return false;
      }
    }
    async function copy(){
      if(!payload)return;
      const txt=payload.parts[at];
      try{
        if(typeof navigator!=="undefined"&&navigator.clipboard?.writeText){
          await navigator.clipboard.writeText(txt);
          el.status.textContent="คัดลอกข้อความแล้ว นำไปวางใน LINE ได้เลย";
        }else if(typeof el.preview.select==="function"&&document.execCommand){
          el.preview.select();
          if(!document.execCommand("copy"))throw Error("Copy rejected");
          el.status.textContent="คัดลอกข้อความแล้ว นำไปวางใน LINE ได้เลย";
        }else throw Error("Clipboard unavailable");
      }catch(error){
        el.status.textContent="คัดลอกอัตโนมัติไม่ได้ กรุณาเลือกข้อความแล้วคัดลอกเอง";
      }
    }
    async function share(){
      if(!payload)return;
      const txt=payload.parts[at];
      if(typeof navigator!=="undefined"&&typeof navigator.share==="function"){
        try{
          await navigator.share({text:txt});
          el.status.textContent="ส่งข้อความไปยังแอปที่เลือกแล้ว";
          return;
        }catch(error){
          if(error?.name==="AbortError"){
            el.status.textContent="ยกเลิกการแชร์แล้ว";
            return;
          }
        }
      }
      await copy();
    }
    el.all.addEventListener("click",()=>open("x"));
    el.roster.addEventListener("click",event=>{
      const button=event.target?.closest?.("[data-share-ranking]");
      if(button)open(button.dataset.shareRanking);
    });
    el.close.addEventListener("click",close);
    el.dialog.addEventListener("close",()=>{payload=null;at=0;});
    el.prev.addEventListener("click",()=>{if(payload&&at>0){at--;renderPart();el.status.textContent="";}});
    el.next.addEventListener("click",()=>{if(payload&&at<payload.parts.length-1){at++;renderPart();el.status.textContent="";}});
    el.native.addEventListener("click",share);
    el.copy.addEventListener("click",copy);
    sync();
    return Object.freeze({sync,openGroup:code=>open(code),openAll:()=>open("x"),close});
  }
  root.NongkumStandingsShareUI=Object.freeze({init});
})(globalThis);
