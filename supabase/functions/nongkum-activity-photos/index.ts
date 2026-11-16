import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {putPrivateImage} from "./private-upload.ts";
import {cleanJpegMetadata} from "./jpeg-clean.ts";
import {putPublishedImage,removePublishedImage} from "./public-storage.ts";

/* R40: secure photo intake. No result mutation, public publication or secret in browser.
 * Existing editor sessions upload; separate reviewer sessions approve privately. */
const DB=Deno.env.get("SUPABASE_URL")??"";
const SERVICE=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")??"";
const ORIGINS=new Set(["https://infobwd.github.io"]);
const BUCKET="nongkum-activity-intake";
const PUBLIC_BUCKET="nongkum-activity-public";
const LIMIT=350000;
const JSON_LIMIT=510000;
const encoder=new TextEncoder();
const textDecoder=new TextDecoder();

function headers(origin:string|null){
 const h=new Headers({"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store,max-age=0",
   "X-Content-Type-Options":"nosniff","Vary":"Origin"});
 if(origin&&ORIGINS.has(origin)){
   h.set("Access-Control-Allow-Origin",origin);
   h.set("Access-Control-Allow-Methods","GET,POST,OPTIONS");
   h.set("Access-Control-Allow-Headers","authorization,content-type");
   h.set("Access-Control-Max-Age","300");
 }
 return h;
}
function reply(body:unknown,status:number,origin:string|null){
 return new Response(JSON.stringify(body),{status,headers:headers(origin)});
}
async function jsonBounded(req:Request){
 const reader=req.body?.getReader();
 if(!reader)throw Error("invalid");
 let total=0;const chunks:Uint8Array[]=[];
 try{
   while(true){
     const {done,value}=await reader.read();
     if(done)break;
     total+=value.byteLength;
     if(total>JSON_LIMIT)throw Error("too_large");
     chunks.push(value);
   }
 }finally{reader.releaseLock();}
 const bytes=new Uint8Array(total);let offset=0;
 for(const c of chunks){bytes.set(c,offset);offset+=c.length;}
 const data=JSON.parse(textDecoder.decode(bytes));
 if(!data||typeof data!=="object"||Array.isArray(data))throw Error("invalid");
 return data as Record<string,unknown>;
}
const readU32=(b:Uint8Array,n:number)=>(
 b[n]|(b[n+1]<<8)|(b[n+2]<<16)|(b[n+3]<<24)
)>>>0;
const fourcc=(b:Uint8Array,n:number)=>String.fromCharCode(...b.slice(n,n+4));
function decodeImage(image:string):{bytes:Uint8Array,mime:string}{
 if(image.length>Math.ceil(LIMIT/3)*4+10||image.length<1300||
    !/^[A-Za-z0-9+/]+={0,2}$/.test(image))throw Error("invalid_image");
 const raw=atob(image),bytes=Uint8Array.from(raw,c=>c.charCodeAt(0));
 if(bytes.length<1000||bytes.length>LIMIT)throw Error("invalid_image");
 // JPEG fallback is needed on Safari. Canvas export strips original EXIF.
 // Forged uploads with APP1-APP15, EXIF, ICC, XMP or comments are rejected.
 if(bytes[0]===0xff&&bytes[1]===0xd8){
   // iOS/Safari may add APP2 ICC or other JPEG metadata after Canvas export.
   // Strip all APP/COM segments before Storage rather than permitting metadata leakage.
   return {bytes:cleanJpegMetadata(bytes),mime:"image/jpeg"};
 }
 if(fourcc(bytes,0)!=="RIFF"||fourcc(bytes,8)!=="WEBP"||
    readU32(bytes,4)!==bytes.length-8)throw Error("invalid_image");
 // Only simple VP8/VP8L WebP is allowed. Extended chunks can carry EXIF, XMP or ICC profiles.
 let at=12,chunks=0,width=0,height=0;
 while(at+8<=bytes.length){
   const name=fourcc(bytes,at),length=readU32(bytes,at+4);
   at+=8;
   if(length<5||at+length>bytes.length||++chunks>1)throw Error("invalid_image");
   if(name==="VP8 "){
     if(length<10||bytes[at+3]!==0x9d||bytes[at+4]!==0x01||bytes[at+5]!==0x2a)
       throw Error("invalid_image");
     width=(bytes[at+6]|((bytes[at+7]&0x3f)<<8));
     height=(bytes[at+8]|((bytes[at+9]&0x3f)<<8));
   }else if(name==="VP8L"){
     if(bytes[at]!==0x2f)throw Error("invalid_image");
     width=1+bytes[at+1]+((bytes[at+2]&0x3f)<<8);
     height=1+(bytes[at+2]>>6)+(bytes[at+3]<<2)+((bytes[at+4]&0x0f)<<10);
   }else throw Error("invalid_image");
   at+=length+(length%2);
 }
 if(at!==bytes.length||chunks!==1||width<80||height<80||width>1600||height>1200)
   throw Error("invalid_image");
 return {bytes,mime:"image/webp"};
}
const svcHeaders={"apikey":SERVICE,"Authorization":"Bearer "+SERVICE};
async function rpc(action:string,body:Record<string,unknown>){
 const r=await fetch(DB+"/rest/v1/rpc/nongkum_activity_photo_gateway",{
   method:"POST",headers:{...svcHeaders,"Content-Type":"application/json","Accept":"application/json"},
   body:JSON.stringify({p_action:action,p_data:body}),signal:AbortSignal.timeout(12000)
 });
 if(!r.ok){console.error("R40 RPC failed",r.status);throw Error("unavailable");}
 const x=await r.json();
 if(!x||typeof x.ok!=="boolean")throw Error("unavailable");
 return x;
}
function pathSafe(path:string){
 return /^uploads\/[0-9a-f-]{36}\.(webp|jpg)$/.test(path);
}
async function upload(path:string,bytes:Uint8Array,mime:string){
 if(!pathSafe(path))throw Error("unavailable");
 await putPrivateImage({db:DB,serviceKey:SERVICE,bucket:BUCKET,path,bytes,mime});
}
async function removePrivate(path:string){
 if(!pathSafe(path))return;
 try{await fetch(DB+"/storage/v1/object/"+BUCKET+"/"+path,{
   method:"DELETE",headers:svcHeaders,signal:AbortSignal.timeout(10000)
 });}catch(_){/* Private object is still never public; reconciliation can clean it. */}
}
async function getPrivate(path:string){
 if(!pathSafe(path))throw Error("unavailable");
 const r=await fetch(DB+"/storage/v1/object/authenticated/"+BUCKET+"/"+path,{
   headers:svcHeaders,signal:AbortSignal.timeout(15000)
 });
 if(!r.ok)throw Error("unavailable");
 const bytes=new Uint8Array(await r.arrayBuffer());
 if(bytes.length>LIMIT||bytes.length<1000)throw Error("invalid_image");
 return bytes;
}

/* R40-G publication: existing reviewer token stays server-side; only published
 * whitelist fields are served to anonymous viewers. No private URLs are returned. */
async function publicationRpc(action:string,body:Record<string,unknown>){
 const r=await fetch(DB+"/rest/v1/rpc/nongkum_activity_photo_publication_gateway",{
   method:"POST",headers:{...svcHeaders,"Content-Type":"application/json","Accept":"application/json"},
   body:JSON.stringify({p_action:action,p_data:body}),signal:AbortSignal.timeout(12000)
 });
 if(!r.ok){console.error("R40-G publication RPC unavailable",r.status);throw Error("unavailable");}
 const value=await r.json();
 if(!value||typeof value.ok!=="boolean")throw Error("unavailable");
 return value;
}
const publicPathSafe=(path:string)=>/^media\/[0-9a-f-]{36}\.(webp|jpg)$/.test(path);
async function writePublic(path:string,bytes:Uint8Array,mime:string){
 await putPublishedImage({db:DB,serviceKey:SERVICE,bucket:PUBLIC_BUCKET,path,bytes,mime});
}
async function deletePublic(path:string){
 return await removePublishedImage({db:DB,serviceKey:SERVICE,bucket:PUBLIC_BUCKET,path});
}
async function publishedFeed(){
 const columns="id,event_id,sport_id,division,event_date,caption,object_path,mime_type,published_at";
 const r=await fetch(DB+"/rest/v1/nongkum_public_activity_photos?select="+columns+
   "&order=published_at.desc&limit=500",{
   headers:{...svcHeaders,Accept:"application/json"},signal:AbortSignal.timeout(12000)
 });
 if(!r.ok)throw Error("unavailable");
 const data=await r.json();
 if(!Array.isArray(data))throw Error("unavailable");
 // SQL table contains *only* public metadata, never consent notes or personal data.
 return data;
}

const code=(e:string)=>e==="expired"?401:e==="limited"?429:
 ["stale","source_changed","missing"].includes(e)?409:
 e==="forbidden"?403:e==="unavailable"||e==="upload_failed"?503:400;

Deno.serve(async(req:Request)=>{
 const origin=req.headers.get("origin");
 if(!origin||!ORIGINS.has(origin))return reply({ok:false,error:"forbidden"},403,null);
 if(req.method==="OPTIONS")return new Response(null,{status:204,headers:headers(origin)});
 if(!DB||!SERVICE)return reply({ok:false,error:"unavailable"},503,origin);
 if(req.method==="GET"){
   try{return reply({ok:true,items:await publishedFeed()},200,origin);}
   catch(_){return reply({ok:false,error:"unavailable"},503,origin);}
 }
 if(req.method!=="POST")return reply({ok:false,error:"invalid"},405,origin);
 if(Number(req.headers.get("content-length")||0)>JSON_LIMIT)return reply({ok:false,error:"too_large"},413,origin);
 try{
   const body=await jsonBounded(req);
   const action=String(body.action||"");
   if(!["upload","queue","preview","approve","reject","publish","revoke"].includes(action))
      return reply({ok:false,error:"invalid"},400,origin);
   const m=/^Bearer ([a-f0-9]{64})$/.exec(req.headers.get("authorization")||"");
   if(!m)return reply({ok:false,error:"expired"},401,origin);
   const token=m[1];
   if(action==="upload"){
      const image=body.image_b64;
      if(typeof image!=="string")return reply({ok:false,error:"invalid_image"},400,origin);
      const {bytes,mime}=decodeImage(image);
      const prepared=await rpc("prepare",{token,event_id:body.event_id,
        uploaded_by:body.uploaded_by,caption:body.caption,mime_type:mime,
        byte_size:bytes.length});
      if(!prepared.ok)return reply(prepared,code(prepared.error),origin);
      const path=String(prepared.storage_path||""),id=String(prepared.id||"");
      if(!pathSafe(path)||!/^[0-9a-f-]{36}$/.test(id))throw Error("unavailable");
      try{
        await upload(path,bytes,mime);
        const finished=await rpc("finish",{token,id});
        if(!finished.ok){await removePrivate(path);await rpc("cancel",{token,id});return reply(finished,code(finished.error),origin);}
        return reply({ok:true,id,status:"review",message:"ส่งภาพแล้ว รอผู้ตรวจ"},200,origin);
      }catch(err){
        await removePrivate(path);
        try{await rpc("cancel",{token,id});}catch(_){}
        throw err;
      }
   }

   if(action==="queue"){
     const pending=await rpc("queue",{token});
     if(!pending.ok)return reply(pending,code(pending.error),origin);
     const reviewed=await publicationRpc("queue",{token});
     if(!reviewed.ok)return reply(reviewed,code(reviewed.error),origin);
     const items=[
       ...(Array.isArray(pending.items)?pending.items:[]).map((x:Record<string,unknown>)=>({...x,status:"review",publication_status:"private"})),
       ...(Array.isArray(reviewed.items)?reviewed.items:[])
     ];
     return reply({ok:true,items},200,origin);
   }
   if(action==="publish"){
     const prepared=await publicationRpc("prepare",{
       token,id:body.id,public_consent_checked:body.public_consent_checked,
       public_consent_note:body.public_consent_note
     });
     if(!prepared.ok)return reply(prepared,code(prepared.error),origin);
     const from=String(prepared.private_path||""),to=String(prepared.public_path||"");
     const mime=String(prepared.mime_type||""),id=String(prepared.id||"");
     if(!pathSafe(from)||!publicPathSafe(to)||!/^[0-9a-f-]{36}$/.test(id))
        throw Error("unavailable");
     let stored=false;
     try{
       const bytes=await getPrivate(from);
       if(bytes.length!==prepared.byte_size||(mime==="image/webp"&&!to.endsWith(".webp"))
          ||(mime==="image/jpeg"&&!to.endsWith(".jpg")))throw Error("invalid_image");
       await writePublic(to,bytes,mime);
       stored=true;
       const done=await publicationRpc("finish",{token,id});
       if(!done.ok){
         // A confirmed reject cannot have published the catalog entry.
         if(await deletePublic(to))await publicationRpc("fail",{token,id});
         return reply(done,code(done.error),origin);
       }
       return reply({ok:true,id,status:"published"},200,origin);
     }catch(err){
       // If finish timed out, its commit is unknown: never delete a possibly published
       // image. Keep 'publishing' for manual reconciliation instead.
       if(!stored){
         try{await deletePublic(to);await publicationRpc("fail",{token,id});}catch(_){}
       }
       throw err;
     }
   }
   if(action==="revoke"){
     const removed=await publicationRpc("revoke",{token,id:body.id,reason:body.reason});
     if(!removed.ok)return reply(removed,code(removed.error),origin);
     let cleaned=false;
     try{cleaned=await deletePublic(String(removed.public_path||""));}catch(_){}
     return reply({ok:true,status:"revoked",cleanup_pending:!cleaned},200,origin);
   }
   if(action==="preview"){
      const item=await rpc("preview",{token,id:body.id});
      if(!item.ok)return reply(item,code(item.error),origin);
      const mime=String(item.mime_type||"");
      if(!["image/webp","image/jpeg"].includes(mime))throw Error("unavailable");
      const bytes=await getPrivate(String(item.storage_path||""));
      // The signed-in reviewer receives only this private response; never a public Storage URL.
      let binary="";for(let i=0;i<bytes.length;i+=8192)
        binary+=String.fromCharCode(...bytes.slice(i,i+8192));
      return reply({ok:true,image_b64:btoa(binary),mime_type:mime},200,origin);
   }
   const input=action==="approve"?
     {token,id:body.id,consent_checked:body.consent_checked,consent_note:body.consent_note}:
     action==="reject"?{token,id:body.id,reason:body.reason}:{token};
   const result=await rpc(action,input);
   return reply(result,result.ok?200:code(result.error),origin);
 }catch(err){
   const reason=err instanceof Error?err.message:"unavailable";
   const e=["invalid_image","too_large","upload_failed"].includes(reason)?reason:"unavailable";
   return reply({ok:false,error:e},e==="too_large"?413:code(e),origin);
 }
});
