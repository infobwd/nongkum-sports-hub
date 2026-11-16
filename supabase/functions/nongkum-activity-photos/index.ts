import "jsr:@supabase/functions-js/edge-runtime.d.ts";
// R40: private photo intake and independent reviewer approval. No raw file or access key in public feed.
const DB=Deno.env.get("SUPABASE_URL")??"";
const SERVICE=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")??"";
const ORIGIN="https://infobwd.github.io";
const BASE="https://zprxvpfkvforoxrboqiv.supabase.co";
const PRIVATE="nongkum-activity-intake",PUBLIC="nongkum-activity-public";
const MAX_FILE=650000,MAX_BODY=920000;
const jsonHeaders=(origin:string|null)=> {
 const h=new Headers({"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store",
  "X-Content-Type-Options":"nosniff","Vary":"Origin"});
 if(origin===ORIGIN){
  h.set("Access-Control-Allow-Origin",ORIGIN);
  h.set("Access-Control-Allow-Methods","GET,POST,OPTIONS");
  h.set("Access-Control-Allow-Headers","authorization,content-type");
  h.set("Access-Control-Max-Age","300");
 }
 return h;
};
function reply(value:unknown,status:number,origin:string|null){
 return new Response(JSON.stringify(value),{status,headers:jsonHeaders(origin)});
}
const serviceHeaders={"apikey":SERVICE,"Authorization":"Bearer "+SERVICE};
type Ans={ok:boolean,error?:string,[name:string]:unknown};
async function rpc(action:string,values:Record<string,unknown>):Promise<Ans>{
 const r=await fetch(DB+"/rest/v1/rpc/nongkum_activity_gateway",{
  method:"POST",headers:{...serviceHeaders,"Content-Type":"application/json","Accept":"application/json"},
  body:JSON.stringify({p_action:action,p_data:values}),signal:AbortSignal.timeout(10000)
 });
 if(!r.ok)throw Error("Photo RPC unavailable "+r.status);
 const v=await r.json();
 if(!v||typeof v.ok!=="boolean")throw Error("Photo RPC contract");
 return v;
}
function photoURL(bucket:string,path:string){return DB+"/storage/v1/object/"+bucket+"/"+path;}
async function upload(bucket:string,path:string,bytes:Uint8Array){
 const r=await fetch(photoURL(bucket,path),{
  method:"POST",headers:{...serviceHeaders,"Content-Type":"image/webp","x-upsert":"false",
   "Cache-Control":"max-age=3600"},body:bytes,signal:AbortSignal.timeout(12000)
 });
 if(!r.ok)throw Error("Photo Storage upload failed "+r.status);
}
async function remove(bucket:string,path:string){
 try{await fetch(photoURL(bucket,path),{method:"DELETE",headers:serviceHeaders,signal:AbortSignal.timeout(8000)});}
 catch(_){/* cleanup is best effort; orphan audit remains private */ }
}
function readWebp(bytes:Uint8Array){
 if(bytes.length<30||bytes.length>MAX_FILE)return false;
 const ascii=(o:number,n:number)=>String.fromCharCode(...bytes.slice(o,o+n));
 if(ascii(0,4)!=="RIFF"||ascii(8,4)!=="WEBP")return false;
 const declared=(bytes[4]|bytes[5]<<8|bytes[6]<<16|bytes[7]<<24)>>>0;
 if(declared!==bytes.length-8)return false;
 let cursor=12,hasPixel=false;
 while(cursor+8<=bytes.length){
  const tag=ascii(cursor,4),size=(bytes[cursor+4]|bytes[cursor+5]<<8|bytes[cursor+6]<<16|bytes[cursor+7]<<24)>>>0;
  if(size>bytes.length-8-cursor)return false;
  if(tag==="EXIF"||tag==="XMP ")return false;
  if(["VP8 ","VP8L","VP8X"].includes(tag))hasPixel=true;
  cursor+=8+size+(size%2);
 }
 return cursor===bytes.length&&hasPixel;
}
async function dataBytes(data:unknown){
 if(typeof data!=="string"||data.length>875000||!/^[A-Za-z0-9+/]+={0,2}$/.test(data))
  throw Error("Invalid image data");
 const decoded=atob(data);
 const bytes=Uint8Array.from(decoded,x=>x.charCodeAt(0));
 if(!readWebp(bytes))throw Error("Invalid WebP, EXIF or file size");
 return bytes;
}
async function digest(bytes:Uint8Array){
 const h=new Uint8Array(await crypto.subtle.digest("SHA-256",bytes));
 return [...h].map(n=>n.toString(16).padStart(2,"0")).join("");
}
function tokenOf(req:Request){
 const m=/^Bearer ([0-9a-f]{64})$/.exec(req.headers.get("authorization")||"");
 return m?.[1]||"";
}
function errorStatus(r:Ans){
 return r.ok?200:r.error==="expired"?401:
 ["limited"].includes(r.error||"")?429:
 ["missing","stale"].includes(r.error||"")?409:400;
}
Deno.serve(async(req:Request)=>{
 const origin=req.headers.get("origin");
 if(origin!==ORIGIN)return reply({ok:false,error:"forbidden"},403,null);
 if(req.method==="OPTIONS")return new Response(null,{status:204,headers:jsonHeaders(origin)});
 if(!DB.startsWith("https://")||!SERVICE)return reply({ok:false,error:"unavailable"},503,origin);
 if(req.method==="GET"){
  const url=new URL(req.url);
  if(url.searchParams.get("action")!=="published")return reply({ok:false,error:"invalid"},400,origin);
  try{
   const data=await rpc("published",{});
   if(!data.ok)return reply(data,errorStatus(data),origin);
   const rows=Array.isArray(data.photos)?data.photos:[];
   const safe=rows.filter((x):x is Record<string,unknown>=>!!x&&typeof x==="object"&&
     typeof (x as Record<string,unknown>).path==="string"&&
     /^photos\/[a-f0-9-]{36}\.webp$/.test(String((x as Record<string,unknown>).path)))
     .map(x=>({event_id:x.event_id,sport_id:x.sport_id,division:x.division,
      caption:x.caption,revision:x.revision,
      src:BASE+"/storage/v1/object/public/"+PUBLIC+"/"+x.path}));
   return reply({ok:true,approved_only:true,photos:safe},200,origin);
  }catch(_){return reply({ok:false,error:"unavailable"},503,origin);}
 }
 if(req.method!=="POST")return reply({ok:false,error:"method"},405,origin);
 try{
  if(Number(req.headers.get("content-length")||"0")>MAX_BODY)return reply({ok:false,error:"too_large"},413,origin);
  const buf=await req.arrayBuffer();
  if(buf.byteLength>MAX_BODY)return reply({ok:false,error:"too_large"},413,origin);
  const body=JSON.parse(new TextDecoder().decode(buf));
  if(!body||typeof body!=="object"||Array.isArray(body))return reply({ok:false,error:"invalid"},400,origin);
  const action=String(body.action||"");
  if(!["upload","queue","preview","approve","reject"].includes(action))
   return reply({ok:false,error:"invalid"},400,origin);
  const token=tokenOf(req);
  if(!token)return reply({ok:false,error:"expired"},401,origin);
  if(action==="upload"){
   const id=crypto.randomUUID();
   const path="photos/"+id+".webp";
   const idFixture=String(body.fixture_id||"");
   const pre=await rpc("preflight",{token,fixture_id:idFixture});
   if(!pre.ok)return reply(pre,errorStatus(pre),origin);
   if(body.consent_attested!==true||typeof body.uploader_name!=="string"||
     typeof body.caption!=="string")return reply({ok:false,error:"consent_required"},400,origin);
   const bytes=await dataBytes(body.data);
   const hash=await digest(bytes);
   await upload(PRIVATE,path,bytes);
   try{
    const result=await rpc("register",{token,photo_id:id,fixture_id:idFixture,
      caption:body.caption,uploader_name:body.uploader_name,consent_attested:true,
      image_sha256:hash,file_bytes:bytes.length});
    if(!result.ok){await remove(PRIVATE,path);return reply(result,errorStatus(result),origin);}
    return reply({ok:true,photo_id:id,status:"pending"},200,origin);
   }catch(_){await remove(PRIVATE,path);throw Error("register failed");}
  }
  if(action==="queue"){
   const result=await rpc("queue",{token});
   return reply(result,errorStatus(result),origin);
  }
  if(action==="preview"){
   const result=await rpc("preview",{token,photo_id:body.photo_id});
   if(!result.ok)return reply(result,errorStatus(result),origin);
   const path=String(result.private_path||"");
   if(!/^photos\/[0-9a-f-]{36}\.webp$/.test(path))throw Error("Invalid private path");
   const r=await fetch(DB+"/storage/v1/object/sign/"+PRIVATE+"/"+path,{
    method:"POST",headers:{...serviceHeaders,"Content-Type":"application/json"},
    body:JSON.stringify({expiresIn:60}),signal:AbortSignal.timeout(8000)
   });
   if(!r.ok)throw Error("Preview signing failed");
   const obj=await r.json();
   const signed=String(obj.signedURL||obj.signedUrl||"");
   if(!signed.startsWith("/object/sign/"+PRIVATE+"/"))throw Error("Unexpected signed URL");
   return reply({ok:true,preview_url:DB+"/storage/v1"+signed},200,origin);
  }
  if(action==="reject"){
   const result=await rpc("reject",{token,photo_id:body.photo_id,reason:body.reason});
   return reply(result,errorStatus(result),origin);
  }
  // Reviewer confirms image-specific release; storage copy is not an approval decision.
  if(body.consent_verified!==true)return reply({ok:false,error:"consent_required"},400,origin);
  const prepared=await rpc("approve_prepare",{token,photo_id:body.photo_id,consent_verified:true});
  if(!prepared.ok)return reply(prepared,errorStatus(prepared),origin);
  const privatePath=String(prepared.private_path||""),publicPath=String(prepared.public_path||"");
  if(!/^photos\/[0-9a-f-]{36}\.webp$/.test(privatePath)||publicPath!==privatePath)
   throw Error("Invalid approval path");
  try{
   const get=await fetch(DB+"/storage/v1/object/authenticated/"+PRIVATE+"/"+privatePath,{
    headers:serviceHeaders,signal:AbortSignal.timeout(12000)});
   if(!get.ok)throw Error("Private image unavailable");
   const bytes=new Uint8Array(await get.arrayBuffer());
   if(!readWebp(bytes))throw Error("Approved image invalid");
   await upload(PUBLIC,publicPath,bytes);
   const committed=await rpc("approve_commit",{token,photo_id:body.photo_id});
   if(!committed.ok)throw Error("Approval commit failed");
   return reply({ok:true,status:"approved",event_id:committed.event_id},200,origin);
  }catch(_){
   await remove(PUBLIC,publicPath);
   await rpc("approve_cancel",{token,photo_id:body.photo_id}).catch(()=>{});
   return reply({ok:false,error:"unavailable"},503,origin);
  }
 }catch(e){
  console.error("R40 photo gateway request failed",e instanceof Error?e.message:"request error");
  return reply({ok:false,error:"unavailable"},503,origin);
 }
});
