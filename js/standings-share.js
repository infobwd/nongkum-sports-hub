/* R49 — read-only, approved-only standings summaries for LINE.
 * No scores are calculated here; only R48 provisional groups or digest-checked final snapshots.
 * Standings links use /o/ to avoid changing existing /t/ schedule share URLs.
 */
(function(root){
  "use strict";
  const SCHOOL_IDS=Object.freeze(["nongkum","thungmasang","rangkham","wangdong",
    "phuphrom","wangkhaokaew","saohong","nongkrathum"]);
  const SPORTS=Object.freeze({"":"0",football:"f",futsal:"t"});
  const LEVELS=Object.freeze({"":"0",early:"e",primary:"p",secondary:"s"});
  const RANKS=Object.freeze({
    f:{sport:"football",division:"12 ปี ชาย"},
    a:{sport:"futsal",division:"10 ปี ชาย A"},
    b:{sport:"futsal",division:"10 ปี ชาย B"}
  });
  const MAX_CHARS=2200;
  function clean(v){return String(v==null?"":v).replace(/[\r\n\t\u0000-\u001f]+/g," ").trim();}
  function int(v){return Number.isInteger(v)&&v>=0;}
  function groupCode(g){
    return Object.keys(RANKS).find(k=>g?.sport_id===RANKS[k].sport&&g?.division===RANKS[k].division)||"";
  }
  function decode(code){
    if(typeof code!=="string")return null;
    if(Object.hasOwn(RANKS,code))
      return {group:code,sport:RANKS[code].sport,level:"primary",school:""};
    if(!/^x[0ft][0eps][0-8]$/.test(code))return null;
    const sport=Object.keys(SPORTS).find(k=>SPORTS[k]===code[1]);
    const level=Object.keys(LEVELS).find(k=>LEVELS[k]===code[2]);
    const index=Number(code[3]);
    if(sport===undefined||level===undefined||index>SCHOOL_IDS.length)return null;
    return {group:"",sport,level,school:index?SCHOOL_IDS[index-1]:""};
  }
  function encode({group="",sport="",level="",school=""}={}){
    if(Object.hasOwn(RANKS,group))return group;
    if(group||!Object.hasOwn(SPORTS,sport)||!Object.hasOwn(LEVELS,level))return "";
    const index=school?SCHOOL_IDS.indexOf(school)+1:0;
    if(school&&!index)return "";
    return "x"+SPORTS[sport]+LEVELS[level]+index;
  }
  function shortUrl(filters,baseHref){
    const code=encode(filters);
    if(!code)throw Error("Unsupported short standings link");
    const site=new URL("standings.html",baseHref||"https://infobwd.github.io/nongkum-sports-hub/");
    const url=new URL("o/",site);
    url.searchParams.set("c",code);
    return url.toString();
  }
  function eligible(group){
    const key=groupCode(group);
    if(!key||!group||!int(group.approved_count)||!int(group.match_count)||
      !group.approved_count||group.approved_count>group.match_count||
      !(group.provisional===true||group.finalVerified===true)||!Array.isArray(group.rows))
      return false;
    const schools=new Set();
    return group.rows.length>=2&&group.rows.every(row=>{
      const pos=group.finalVerified?row.position:row.provisional_position;
      if(!row||typeof row.team_id!=="string"||schools.has(row.team_id)||
        !Number.isInteger(pos)||pos<1||!int(row.points)||!int(row.played)||
        !int(row.won)||!int(row.drawn)||!int(row.lost)||
        !int(row.goals_for)||!int(row.goals_against)||
        row.goal_difference!==row.goals_for-row.goals_against)return false;
      schools.add(row.team_id);return true;
    });
  }
  function rank(row,group){
    return group.finalVerified?row.position:row.provisional_position;
  }
  function groupText(group,schools){
    const id=groupCode(group),info=RANKS[id];
    const titles={football:"ฟุตบอล",futsal:"ฟุตซอล"};
    const division=info.division.replace(/ A$/,"").replace(/ B$/,"");
    const suffix=id==="f"?" · พบกันหมด":" · สาย "+id.toUpperCase();
    const header=[
      titles[info.sport]+" "+division+suffix,
      (group.finalVerified?"อันดับสรุปจากผลรับรอง":"อันดับชั่วคราว")+
      " · ผลรับรอง "+group.approved_count+"/"+group.match_count+" คู่"
    ];
    const schoolMap=new Map(schools.map(s=>[s.id,clean(s.short||s.name)]));
    const rows=group.rows.slice().sort((a,b)=>rank(a,group)-rank(b,group)||
      (schoolMap.get(a.team_id)||a.team_id).localeCompare(schoolMap.get(b.team_id)||b.team_id,"th"));
    const ranks=new Map();
    for(const r of rows)ranks.set(rank(r,group),(ranks.get(rank(r,group))||0)+1);
    const lines=rows.map(r=>{
      const position=rank(r,group);
      return position+(ranks.get(position)>1?" ร่วม":"")+". "+clean(schoolMap.get(r.team_id)||r.team_id)+
        " | แข่ง "+r.played+" ชนะ "+r.won+" เสมอ "+r.drawn+" แพ้ "+r.lost+
        " | "+r.points+" แต้ม | ผลต่าง "+(r.goal_difference>0?"+":"")+r.goal_difference;
    });
    return [...header,...lines].join("\n");
  }
  function lastPublishedText(value){
    if(!value||typeof value!=="string")return "";
    const time=new Date(value);
    if(Number.isNaN(time.getTime()))return "";
    return "ผลรับรองในระบบเผยแพร่ล่าสุด: "+new Intl.DateTimeFormat("th-TH",{
      timeZone:"Asia/Bangkok",day:"numeric",month:"short",year:"numeric",
      hour:"2-digit",minute:"2-digit",hourCycle:"h23"
    }).format(time)+" น.";
  }
  function makeParts(options){
    const data=options?.data,raw=options?.groups;
    if(!data||!Array.isArray(data.schools)||!Array.isArray(data.results)||
      data.metadata?.approved_only!==true||
      data.metadata.approved_results_count!==data.results.length||
      data.results.some(r=>r?.status!=="approved")||!Array.isArray(raw))
      throw Error("Approved-only results required");
    const groups=raw.filter(eligible);
    if(!groups.length)return {parts:[],count:0,url:"",groups:[]};
    const one=options.scope&&options.scope!=="x"?options.scope:"";
    if(one&&(groups.length!==1||groupCode(groups[0])!==one))
      throw Error("Single standings group mismatch");
    const url=shortUrl(one?{group:one}:{group:"",
      sport:options.filters?.sport||"",level:options.filters?.level||"",
      school:options.filters?.school||""},options.baseHref);
    const intro="ตารางอันดับ · มิตรภาพเกมส์ 2569";
    const school=data.schools.find(s=>s.id===options.filters?.school);
    const filter=one?"":(school?"โรงเรียนที่เลือก: "+clean(school.short||school.name)+
      " (แสดงทุกทีมในสายที่เกี่ยวข้อง)\n":"");
    const stamped=lastPublishedText(data.metadata.published_at);
    const notice=[
      "เกณฑ์: คะแนน → ผลต่างประตูรวม → ผลการพบกันเอง",
      "อันดับชั่วคราวไม่ใช่การยืนยันทีมเข้ารอบ และอาจเปลี่ยนเมื่อมีผลเพิ่ม",
      ...(stamped?[stamped]:[]),
      ...(options.source==="live"?[]:["ข้อมูลจากสำเนาผลรับรอง อาจไม่ใช่รายการล่าสุด โปรดตรวจในแอป"]),
      "เปิดตารางอันดับล่าสุดในแอป:\n"+url
    ].join("\n");
    const chunks=[];let current=[];
    for(const g of groups){
      const segment=groupText(g,data.schools);
      const trial=[...current,segment];
      const payload=intro+"\n"+filter+"\n"+trial.join("\n\n")+"\n\n"+notice;
      if(current.length&&payload.length>MAX_CHARS){chunks.push(current);current=[];}
      current.push(segment);
    }
    if(current.length)chunks.push(current);
    const parts=chunks.map((chunk,i)=>intro+
      (chunks.length>1?" · ตอนที่ "+(i+1)+"/"+chunks.length:"")+
      "\n"+filter+"\n"+chunk.join("\n\n")+"\n\n"+notice);
    return {parts,count:groups.length,url,groups:groups.map(groupCode),partCount:parts.length};
  }
  root.NongkumStandingsShare=Object.freeze({encode,decode,shortUrl,groupCode,eligible,makeParts});
})(globalThis);
