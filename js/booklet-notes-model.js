/* R24-I: read-only booklet observations. Reuse R11A source_qa; never infer organizer approval. */
(function(root,factory){
  "use strict";
  const model=factory();
  if(typeof module==="object"&&module.exports)module.exports=model;
  if(root)root.NongkumBookletNotes=model;
})(typeof globalThis!=="undefined"?globalThis:this,function(){
  "use strict";
  const PRIORITIES=Object.freeze(["urgent","important","followup"]);
  const STATES=Object.freeze(["needs_review","web_handled_document_pending","reference_only"]);
  const EXCLUDED="football-p07-มัธยมหญิง-020-repeated-final";
  const PDF_HASH="1cd0d0166fe202b2b69e18f5ec2e1c2d80439386767a1826bf21d7d5da9e0bbf";
  function ok(b,msg){if(!b)throw Error(msg);}
  function build(register,raw){
    ok(register&&register.schema_version===1&&register.publication_status==="draft_review_not_approved"&&
      register.revision==="r24i-20261108-review-only","invalid_observation_registry");
    const meta=register.source||{};
    ok(meta.path==="data/program-from-pdf-2569-20261104-draft.json"&&
      meta.source_pdf_sha256===PDF_HASH&&meta.excluded_fixture_id===EXCLUDED&&
      meta.source_qa_codes===11&&meta.raw_fixture_count===237&&meta.active_fixture_count===236,
      "observation_source_contract_changed");
    ok(raw?.schema_version===3&&raw?.metadata?.source_sha256===PDF_HASH&&
      raw.metadata.source_status==="revised_pdf_draft"&&raw.metadata.all_data_approved===false&&
      Array.isArray(raw.source_qa)&&raw.source_qa.length===11&&
      Array.isArray(raw.fixtures)&&raw.fixtures.length===237&&
      raw.fixtures.filter(x=>x.id!==EXCLUDED).length===236,
      "source_revision_mismatch");
    const sources=new Map();
    raw.source_qa.forEach(s=>{
      ok(typeof s.code==="string"&&s.status==="needs_review"&&typeof s.description==="string"&&
        !sources.has(s.code),"source_qa_invalid");
      sources.set(s.code,s.description);
    });
    ok(Array.isArray(register.notes)&&register.notes.length>0&&register.notes.length<=60,"notes_missing");
    const found=new Set(),covered=new Set();
    const notes=register.notes.map(n=>{
      ok(n&&typeof n.id==="string"&&/^[A-Z0-9-]{4,70}$/.test(n.id)&&!found.has(n.id),"duplicate_note_id");
      found.add(n.id);
      ok(PRIORITIES.includes(n.priority)&&STATES.includes(n.state)&&
        ["คู่แข่งขัน","ผังการแข่งขัน","วันเวลาและสนาม","กรีฑา","ข้อมูลอ้างอิง","เอกสารและกรรมการ","รูปแบบและการพิมพ์"].includes(n.category),
        "invalid_note_classification");
      ok(typeof n.title==="string"&&n.title.length>2&&
        typeof n.impact==="string"&&n.impact.length>4&&
        typeof n.action==="string"&&n.action.length>4&&typeof n.sport==="string"&&
        Array.isArray(n.pages)&&n.pages.every(pg=>Number.isInteger(pg)&&pg>=1&&pg<=41),
        "invalid_note_details");
      ok(Array.isArray(n.source_codes)&&n.source_codes.length<=5&&
        Array.isArray(n.evidence)&&n.evidence.length>0&&n.evidence.every(e=>
          typeof e.label==="string"&&typeof e.url==="string"&&
          /^https:\/\/github\.com\/infobwd\/nongkum-sports-hub\/blob\/main\/docs\/[\w.-]+\.md$/.test(e.url)),
        "invalid_note_evidence");
      const findings=[];
      if(n.source_codes.length)ok(Array.isArray(n.reader_findings)&&
        n.reader_findings.length===n.source_codes.length&&
        n.reader_findings.every(t=>typeof t==="string"&&t.length>8),
        "reader_findings_required");
      else ok(!n.reader_findings,"unexpected_reader_findings");
      for(const c of n.source_codes) {
        ok(sources.has(c)&&!covered.has(c),"unmatched_or_repeated_source_qa");
        covered.add(c);findings.push(n.reader_findings[findings.length]);
      }
      if(!findings.length)ok(typeof n.finding==="string"&&n.finding.length>8,"missing_document_finding");
      if(findings.length)ok(!n.finding,"duplicated_source_finding");
      return Object.freeze({...n,findings:findings.length?findings:[n.finding]});
    });
    ok(covered.size===sources.size,"source_qa_not_fully_covered");
    const priorityOrder={urgent:0,important:1,followup:2};
    notes.sort((a,b)=>priorityOrder[a.priority]-priorityOrder[b.priority]||a.title.localeCompare(b.title,"th"));
    return Object.freeze({
      revision:register.revision,
      source_qa_count:sources.size,
      notes:Object.freeze(notes),
      counts:Object.freeze({
        total:notes.length,
        urgent:notes.filter(n=>n.priority==="urgent").length,
        needs_review:notes.filter(n=>n.state==="needs_review").length,
        web_adjusted:notes.filter(n=>n.state==="web_handled_document_pending").length,
        reference:notes.filter(n=>n.state==="reference_only").length
      })
    });
  }
  function filter(notes,options){
    const p=options||{};
    const q=String(p.query||"").toLocaleLowerCase("th").trim();
    return notes.filter(n=>
      (!p.priority||p.priority===n.priority)&&
      (!p.category||p.category===n.category)&&
      (!p.sport||p.sport===n.sport)&&
      (!p.state||p.state===n.state)&&
      (!q||[n.title,n.id,n.sport,n.category,n.impact,n.action,...n.source_codes,...n.findings]
        .join(" ").toLocaleLowerCase("th").includes(q))
    );
  }
  function copyText(note){
    return [
      "มิตรภาพเกมส์ 2569 — เรื่องที่ขอให้ช่วยตรวจ (ยังไม่ใช่ข้อยุติจากผู้จัด)",
      "หัวข้อ: "+note.title,
      "สถานะ: "+({
        needs_review:"รอตรวจจากผู้รับผิดชอบ",
        web_handled_document_pending:"เว็บจัดการแล้ว แต่สูจิบัตรยังต้องตรวจ",
        reference_only:"ข้อมูลประกอบ ไม่ใช่ข้อผิดพลาดที่ยืนยัน"
      }[note.state]),
      "สูจิบัตรฉบับแข่งขัน หน้า: "+(note.pages.length?note.pages.join(", "):"โปรดเปิดเอกสารประกอบเพื่อตรวจรายละเอียด"),
      "สิ่งที่พบ: "+note.findings.join(" / "),
      "หากข้อมูลไม่ถูกต้องอาจเกิดอะไรขึ้น: "+note.impact,
      "ขอให้ตรวจสอบ: "+note.action,
      "หลักฐาน/มติจากผู้จัด: (รอกรอก)",
      "หมายเหตุ: การส่งข้อความนี้ยังไม่ใช่การยืนยันข้อมูลจากผู้จัด"
    ].join("\n");
  }
  return Object.freeze({build,filter,copyText,PRIORITIES,STATES});
});
