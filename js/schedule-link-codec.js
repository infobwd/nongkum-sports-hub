/* R47 — stable reversible compact token for public school/day schedule links.
 * Version 1 is append-only: NEVER reorder existing school/sport codes.
 * No private information or server state is encoded here.
 */
(function(root){
  "use strict";
  const SCHOOLS=["","nongkum","thungmasang","rangkham","wangdong","phuphrom","wangkhaokaew","saohong","nongkrathum"];
  const SPORTS=["","football","shootout","futsal","volleyball","takraw","petanque","tabletennis","tugofwar","athletics"];
  const LEVELS=["","early","primary","secondary"];
  const BASE=Date.UTC(2020,0,1),LAST=Date.UTC(2049,11,31),DAY_MS=86400000;
  const MAX_OFFSET=Math.floor((LAST-BASE)/DAY_MS);
  function normalizedDay(value){
    if(value==="unknown"||value==="")return value;
    if(!/^\d{4}-\d{2}-\d{2}$/.test(value||""))return null;
    const date=new Date(value+"T12:00:00Z");
    if(!Number.isFinite(date.getTime())||date.toISOString().slice(0,10)!==value)return null;
    const day=Math.round((Date.UTC(date.getUTCFullYear(),date.getUTCMonth(),date.getUTCDate())-BASE)/DAY_MS);
    return day>=0&&day<=MAX_OFFSET?value:null;
  }
  function encode(input){
    if(!input||input.query)return "";
    const s=SCHOOLS.indexOf(input.school||""),g=SPORTS.indexOf(input.sport||""),
      l=LEVELS.indexOf(input.level||"");
    if(s<0||g<0||l<0||!["all","pending",undefined,""].includes(input.resultMode))return "";
    const day=normalizedDay(input.day||"");
    if(day===null)return "";
    const d=day===""?0:day==="unknown"?1:2+Math.round((Date.parse(day+"T00:00:00Z")-BASE)/DAY_MS);
    const r=input.resultMode==="all"?1:0;
    const n=((((d*LEVELS.length+l)*SPORTS.length+g)*SCHOOLS.length+s)*2)+r;
    return "1"+n.toString(36);
  }
  function decode(code){
    if(typeof code!=="string"||!/^1[0-9a-z]{1,7}$/.test(code))return null;
    let n=parseInt(code.slice(1),36);
    if(!Number.isSafeInteger(n))return null;
    const r=n%2;n=Math.floor(n/2);
    const si=n%SCHOOLS.length;n=Math.floor(n/SCHOOLS.length);
    const gi=n%SPORTS.length;n=Math.floor(n/SPORTS.length);
    const li=n%LEVELS.length;n=Math.floor(n/LEVELS.length);
    if(n>MAX_OFFSET+2)return null;
    const day=n===0?"":n===1?"unknown":new Date(BASE+(n-2)*DAY_MS).toISOString().slice(0,10);
    const result={school:SCHOOLS[si],sport:SPORTS[gi],level:LEVELS[li],
      day,resultMode:r?"all":"pending"};
    return encode(result)===code?result:null;
  }
  root.NongkumScheduleLinkCodec=Object.freeze({encode,decode});
})(globalThis);
