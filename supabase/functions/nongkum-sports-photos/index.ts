import "jsr:@supabase/functions-js/edge-runtime.d.ts";

// R39-E: only staff-issued R34/R37 sessions can upload, preview or approve.
// Images are private until a separate reviewer confirms publication consent.
// Service-role credentials stay on this server; no public upload tokens or anonymous writes.
const DB = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const ORIGINS = new Set(["https://infobwd.github.io"]);
const PRIVATE_BUCKET = "nongkum-sports-photo-pending";
const PUBLIC_BUCKET = "nongkum-sports-photo-public";
const MAX_FILE = 350000;
const MAX_BODY = 600000;
const MAX_JSON = 12000;
const FILE_PATTERN = /^(?:pending|approved)\/[0-9a-f-]{36}\.webp$/;
const UUID_PATTERN = /^[0-9a-f-]{36}$/i;
const encoder = new TextEncoder();
const decoder = new TextDecoder();

function cors(origin: string|null) {
  const h = new Headers({
    "Content-Type":"application/json; charset=utf-8",
    "Cache-Control":"no-store,max-age=0",
    "X-Content-Type-Options":"nosniff",
    "Vary":"Origin",
  });
  if(origin && ORIGINS.has(origin)){
    h.set("Access-Control-Allow-Origin",origin);
    h.set("Access-Control-Allow-Methods","POST,OPTIONS");
    h.set("Access-Control-Allow-Headers","authorization,content-type,apikey");
    h.set("Access-Control-Max-Age","300");
  }
  return h;
}
function reply(data:unknown,code:number,origin:string|null){
  return new Response(JSON.stringify(data),{status:code,headers:cors(origin)});
}
function fail(error:string,origin:string|null,code=400){
  return reply({ok:false,error},code,origin);
}
function statusCode(error:string){
  return error==="expired"?401:error==="limited"?429:
    error==="stale"||error==="source_changed"||error==="missing"?409:
    error==="unavailable"?503:error==="too_large"?413:400;
}
async function bounded(req:Request,max:number){
  const len=Number(req.headers.get("content-length")||0);
  if(!Number.isFinite(len)||len>max)return null;
  const reader=req.body?.getReader();
  if(!reader)return new Uint8Array();
  const parts:Uint8Array[]=[];let size=0;
  try {
    while(true){
      const {value,done}=await reader.read();
      if(done)break;
      size+=value.length;
      if(size>max){await reader.cancel();return null;}
      parts.push(value);
    }
  }finally{reader.releaseLock();}
  const out=new Uint8Array(size);let pos=0;
  for(const part of parts){out.set(part,pos);pos+=part.length;}
  return out;
}
function safeWebP(buf:Uint8Array):boolean{
  if(buf.length<30||buf.length>MAX_FILE)return false;
  const ascii=(n:number,count:number)=>decoder.decode(buf.subarray(n,n+count));
  if(ascii(0,4)!=="RIFF"||ascii(8,4)!=="WEBP")return false;
  const dv=new DataView(buf.buffer,buf.byteOffset,buf.byteLength);
  if(dv.getUint32(4,true)+8!==buf.length)return false;
  let offset=12,primary=0,width=0,height=0,extended=false;
  while(offset+8<=buf.length){
    const id=ascii(offset,4),len=dv.getUint32(offset+4,true),start=offset+8;
    if(start+len>buf.length)return false;
    if(!["VP8 ","VP8L","VP8X","ALPH"].includes(id))return false;
    if(id==="VP8 "){
      if(len<10||!(buf[start+3]===0x9d&&buf[start+4]===0x01&&buf[start+5]===0x2a))return false;
      width=dv.getUint16(start+6,true)&16383;
      height=dv.getUint16(start+8,true)&16383;primary++;
    }else if(id==="VP8L"){
      if(len<5||buf[start]!==0x2f)return false;
      width=1+(((buf[start+2]&0x3f)<<8)|buf[start+1]);
      height=1+(((buf[start+4]&0x0f)<<10)|(buf[start+3]<<2)|((buf[start+2]&0xc0)>>6));
      primary++;
    }else if(id==="VP8X"){
      if(len!==10||extended)return false;
      // No animation, metadata (EXIF/XMP/ICC) or unknown extended features.
      if((buf[start]&0x3e)!==0)return false;
      extended=true;
    }
    offset=start+len+(len%2);
  }
  return offset===buf.length&&primary===1&&width>0&&height>0&&
    width<=1600&&height<=1200&&width*height<=1920000;
}
function validPath(path:string,bucket:string){
  return FILE_PATTERN.test(path) &&
    (bucket===PRIVATE_BUCKET?path.startsWith("pending/"):path.startsWith("approved/"));
}
function adminHeaders(type?:string){
  const h=new Headers({apikey:SERVICE,Authorization:"Bearer "+SERVICE});
  if(type)h.set("Content-Type",type);
  return h;
}
async function rpc(action:string,token:string,data:Record<string,unknown>={}){
  const res=await fetch(DB+"/rest/v1/rpc/nongkum_photo_gateway",{
    method:"POST",headers:adminHeaders("application/json"),
    body:JSON.stringify({p_action:action,p_data:{...data,token}}),
    signal:AbortSignal.timeout(12000)
  });
  if(!res.ok)throw Error("rpc_http");
  const ans=await res.json();
  if(!ans||typeof ans!=="object"||typeof ans.ok!=="boolean")throw Error("rpc_invalid");
  return ans as Record<string,unknown> & {ok:boolean,error?:string};
}
async function storageUpload(bucket:string,path:string,bytes:Uint8Array){
  if(!validPath(path,bucket))throw Error("invalid_storage_path");
  const res=await fetch(DB+"/storage/v1/object/"+bucket+"/"+path,{
    method:"POST",headers:adminHeaders("image/webp"),body:bytes,
    signal:AbortSignal.timeout(14000)
  });
  if(!res.ok)throw Error("storage_upload");
}
async function storageDownload(path:string){
  if(!validPath(path,PRIVATE_BUCKET))throw Error("invalid_storage_path");
  const res=await fetch(DB+"/storage/v1/object/"+PRIVATE_BUCKET+"/"+path,{
    headers:adminHeaders(),signal:AbortSignal.timeout(14000)
  });
  if(!res.ok)throw Error("storage_download");
  const len=Number(res.headers.get("content-length")||0);
  if(len>MAX_FILE)throw Error("storage_oversize");
  const data=new Uint8Array(await res.arrayBuffer());
  if(!safeWebP(data))throw Error("invalid_private_image");
  return data;
}
async function storageDelete(bucket:string,path:string){
  if(!validPath(path,bucket))return false;
  try{
    const res=await fetch(DB+"/storage/v1/object/"+bucket,{
      method:"DELETE",headers:adminHeaders("application/json"),
      body:JSON.stringify({prefixes:[path]}),signal:AbortSignal.timeout(14000)
    });
    return res.ok;
  }catch(_){return false;}
}
async function temporaryPreview(path:string){
  if(!validPath(path,PRIVATE_BUCKET))throw Error("invalid_storage_path");
  const res=await fetch(DB+"/storage/v1/object/sign/"+PRIVATE_BUCKET+"/"+path,{
    method:"POST",headers:adminHeaders("application/json"),
    body:JSON.stringify({expiresIn:75}),signal:AbortSignal.timeout(14000)
  });
  if(!res.ok)throw Error("storage_sign");
  const data=await res.json();
  const relative=data?.signedURL||data?.signedUrl;
  if(typeof relative!=="string"||!relative.includes("token="))throw Error("invalid_signed_url");
  const uri=relative.startsWith("https://")?relative:
    DB+"/storage/v1/"+relative.replace(/^\//,"");
  const parsed=new URL(uri);
  if(parsed.origin!==new URL(DB).origin||
    !parsed.pathname.startsWith("/storage/v1/object/sign/"+PRIVATE_BUCKET+"/pending/"))
      throw Error("invalid_signed_url");
  return uri;
}
Deno.serve(async (req:Request)=>{
  const origin=req.headers.get("origin");
  if(!origin||!ORIGINS.has(origin))return fail("forbidden",null,403);
  if(req.method==="OPTIONS")return new Response(null,{status:204,headers:cors(origin)});
  if(req.method!=="POST")return fail("method",origin,405);
  if(!DB||!SERVICE)return fail("unavailable",origin,503);
  const match=/^Bearer ([0-9a-f]{64})$/.exec(req.headers.get("authorization")||"");
  if(!match)return fail("expired",origin,401);
  const token=match[1];
  let action="",input:Record<string,unknown>={},file:File|null=null;
  try{
    const type=req.headers.get("content-type")||"";
    if(type.startsWith("multipart/form-data")){
      const raw=await bounded(req,MAX_BODY);
      if(!raw)return fail("too_large",origin,413);
      const body=new Request(req.url,{method:"POST",headers:{"Content-Type":type},body:raw});
      const form=await body.formData();
      action=String(form.get("action")||"");
      const value=form.get("image");
      if(!(value instanceof File))return fail("invalid",origin);
      file=value;
      input={fixture_id:String(form.get("fixture_id")||""),
        caption:String(form.get("caption")||"")};
    }else if(type.startsWith("application/json")){
      const raw=await bounded(req,MAX_JSON);
      if(!raw)return fail("too_large",origin,413);
      const parsed=JSON.parse(decoder.decode(raw));
      if(!parsed||Array.isArray(parsed)||typeof parsed!=="object")return fail("invalid",origin);
      const {action:kind,...rest}=parsed;
      action=String(kind||"");input=rest;
    }else return fail("invalid",origin,415);
    if(!["upload","status","queue","preview","approve","reject","withdraw"].includes(action))
      return fail("invalid",origin);
    if(action==="upload"){
      if(!file||file.type!=="image/webp"||file.size<100||file.size>MAX_FILE)
        return fail("invalid_image",origin,400);
      const bytes=new Uint8Array(await file.arrayBuffer());
      if(!safeWebP(bytes))return fail("invalid_image",origin,400);
      const fixture_id=String(input.fixture_id||"");
      const caption=String(input.caption||"").trim();
      if(fixture_id.length>160||fixture_id.length<4||
         caption.length<3||caption.length>120)return fail("invalid",origin);
      const reserved=await rpc("reserve",token,{fixture_id,caption,file_size:bytes.length});
      if(!reserved.ok)return fail(String(reserved.error||"invalid"),origin,statusCode(String(reserved.error)));
      const id=String(reserved.id||""),path=String(reserved.path||"");
      if(!UUID_PATTERN.test(id)||!validPath(path,PRIVATE_BUCKET))return fail("unavailable",origin,503);
      try{
        await storageUpload(PRIVATE_BUCKET,path,bytes);
        const done=await rpc("finalize",token,{id});
        if(!done.ok)throw Error("finalize");
        return reply({ok:true,id,status:"pending"},200,origin);
      }catch(_){
        await storageDelete(PRIVATE_BUCKET,path);
        try{await rpc("abandon",token,{id});}catch(_){}
        return fail("unavailable",origin,503);
      }
    }
    if(action==="status"){
      const ans=await rpc("status",token);
      return reply(ans,ans.ok?200:statusCode(String(ans.error)),origin);
    }
    if(action==="queue"){
      const ans=await rpc("queue",token);
      return reply(ans,ans.ok?200:statusCode(String(ans.error)),origin);
    }
    if(action==="preview"){
      const id=String(input.id||"");
      if(!UUID_PATTERN.test(id))return fail("invalid",origin);
      const ans=await rpc("get",token,{id});
      if(!ans.ok)return fail(String(ans.error),origin,statusCode(String(ans.error)));
      return reply({ok:true,url:await temporaryPreview(String(ans.path||"")),
        expires_in:75},200,origin);
    }
    if(action==="reject"){
      const ans=await rpc("reject",token,{
        id:String(input.id||""),reason:String(input.reason||"")});
      return reply(ans,ans.ok?200:statusCode(String(ans.error)),origin);
    }
    if(action==="approve"){
      const id=String(input.id||"");
      if(!UUID_PATTERN.test(id)||input.consent_checked!==true)
        return fail("consent_required",origin);
      const metadata=await rpc("get",token,{id});
      if(!metadata.ok)return fail(String(metadata.error),origin,statusCode(String(metadata.error)));
      const bytes=await storageDownload(String(metadata.path||""));
      if(bytes.length!==Number(metadata.file_size))return fail("invalid_image",origin);
      const public_path="approved/"+id+".webp";
      await storageUpload(PUBLIC_BUCKET,public_path,bytes);
      try{
        const result=await rpc("approve",token,{id,public_path,consent_checked:true});
        if(!result.ok){
          await storageDelete(PUBLIC_BUCKET,public_path);
          return fail(String(result.error),origin,statusCode(String(result.error)));
        }
        const old=String(result.replaced_path||"");
        if(old&&old!==public_path)await storageDelete(PUBLIC_BUCKET,old);
        return reply({ok:true,status:"approved",revision:result.revision},200,origin);
      }catch(_){await storageDelete(PUBLIC_BUCKET,public_path);throw Error("approve_failed");}
    }
    if(action==="withdraw"){
      const result=await rpc("withdraw",token,{
        fixture_id:String(input.fixture_id||""),reason:String(input.reason||"")});
      if(!result.ok)return fail(String(result.error),origin,statusCode(String(result.error)));
      const path=String(result.removed_path||"");
      const deleted=await storageDelete(PUBLIC_BUCKET,path);
      return reply({ok:true,status:"withdrawn",file_deleted:deleted},200,origin);
    }
    return fail("invalid",origin);
  }catch(_err){
    return fail("unavailable",origin,503);
  }
});
