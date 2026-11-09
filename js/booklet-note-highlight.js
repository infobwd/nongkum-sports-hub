/* R24-K: note-specific verified-row highlights for the original 41-page booklet.
 * All coordinates are reused from R23's SHA-pinned index. No inferred rectangles. */
(function(root,factory){
  "use strict";
  const api=factory();
  if(typeof module==="object"&&module.exports)module.exports=api;
  if(root)root.NongkumBookletNoteHighlight=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(){
  "use strict";
  const SHA="1cd0d0166fe202b2b69e18f5ec2e1c2d80439386767a1826bf21d7d5da9e0bbf";
  const EXCLUDED="football-p07-มัธยมหญิง-020-repeated-final";
  const NOTE=/^[A-Z0-9-]{4,70}$/;
  const FIXTURE=/^[A-Za-z0-9_.\u0E00-\u0E7F-]{1,180}$/;
  const validRect=r=>Array.isArray(r)&&r.length===4&&
    r.every(v=>typeof v==="number"&&Number.isFinite(v))&&
    r[0]>=0&&r[0]<r[2]&&r[2]<=1&&r[1]>=0&&r[1]<r[3]&&r[3]<=1;

  function resolve(config,index,noteId){
    if(!NOTE.test(String(noteId||""))||!config||!index||
       config.schema_version!==1||config.revision!=="r24k1-20261109-review-only"||
       config.document!=="assets/souvenir-2569-v2.pdf"||
       config.source_pdf_sha256!==SHA||config.source_pdf_pages!==41||
       config.index_entry_count!==236||
       config.notes_revision!=="r24i-20261108-review-only"||
       config.highlight_meaning!=="related_verified_source_row_not_an_approval"||
       index.schema_version!==1||index.source_sha256!==SHA||
       index.source_program_sha256!==SHA||
       index.source_pdf!=="assets/souvenir-2569-v2.pdf"||
       index.source_pdf_pages!==41||
       index.coordinate_space!=="normalized_top_left_cropbox"||
       index.program_correction!=="remove "+EXCLUDED||
       !index.entries||Object.keys(index.entries).length!==236||
       !config.groups||typeof config.groups!=="object"||
       !Object.prototype.hasOwnProperty.call(config.groups,noteId))return null;
    const list=config.groups[noteId];
    if(!Array.isArray(list)||!list.length||list.length>24)return null;
    const seen=new Set(),out=[];
    for(const t of list){
      if(!t||!FIXTURE.test(String(t.fixture_id||""))||
         t.fixture_id===EXCLUDED||seen.has(t.fixture_id)||
         !Number.isInteger(t.page)||t.page<1||t.page>41||
         !["match","track_event"].includes(t.kind)||
         typeof t.number!=="string"||!/^\d{1,3}$/.test(t.number)||
         typeof t.division!=="string"||
         typeof t.description!=="string"||t.description.length<4)return null;
      const r=index.entries[t.fixture_id];
      if(!r||r.page!==t.page||r.kind!==t.kind||
         r.number!==t.number||r.division!==t.division||
         !validRect(r.rect))return null;
      seen.add(t.fixture_id);
      out.push(Object.freeze({fixture_id:t.fixture_id,page:t.page,number:t.number,
        kind:t.kind,division:t.division,description:t.description,rect:r.rect.slice()}));
    }
    return Object.freeze(out);
  }
  function activeForPage(targets,page,index){
    if(!Array.isArray(targets)||!targets.length)return -1;
    if(Number.isInteger(index)&&index>=0&&index<targets.length&&targets[index].page===page)return index;
    return targets.findIndex(t=>t.page===page);
  }
  function draw({targets,page,activeIndex,viewport,overlay,canvas}){
    if(!overlay||!canvas||!viewport||
       !Number.isFinite(viewport.width)||!Number.isFinite(viewport.height)||
       viewport.width<=0||viewport.height<=0)return null;
    const selected=activeForPage(targets,page,activeIndex);
    if(selected<0)return {count:0,selected:-1,top:null};
    const width=Number.parseFloat(canvas.style.width)||viewport.width;
    const height=Number.parseFloat(canvas.style.height)||viewport.height;
    let count=0,focus=null;
    targets.forEach((target,i)=>{
      if(target.page!==page)return;
      const mark=document.createElement("div");
      mark.className="r24k-note-mark"+(i===selected?" r24k-note-mark-current":"");
      mark.style.left=(target.rect[0]*width)+"px";
      mark.style.top=(target.rect[1]*height)+"px";
      mark.style.width=((target.rect[2]-target.rect[0])*width)+"px";
      mark.style.height=((target.rect[3]-target.rect[1])*height)+"px";
      overlay.appendChild(mark);count++;
      if(i===selected)focus={top:target.rect[1]*height,height:(target.rect[3]-target.rect[1])*height};
    });
    return {count,selected,top:focus?.top??null,height:focus?.height??null};
  }
  return Object.freeze({resolve,activeForPage,draw,SHA,EXCLUDED});
});
