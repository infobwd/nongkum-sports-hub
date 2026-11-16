import {putPrivateImage} from "./private-upload.ts";

function check(condition:boolean,message:string):void{
 if(!condition)throw new Error(message);
}
const path="uploads/123e4567-e89b-12d3-a456-426614174000.webp";
Deno.test("private upload sends actual binary bytes, correct headers and no upsert",async()=>{
 const pixels=new Uint8Array(1500);
 for(let i=0;i<pixels.length;i++)pixels[i]=(i*17)%256;
 let calls=0;
 const mockedFetch:typeof fetch=async(url,init)=>{
   calls++;
   check(String(url)==="https://example.supabase.co/storage/v1/object/nongkum-activity-intake/"+path,"unexpected Storage destination");
   check(init?.method==="POST","must POST");
   if(!(init?.body instanceof ArrayBuffer))throw new Error("request must contain an ArrayBuffer body");
   check(init.body.byteLength===pixels.byteLength,"unexpected size");
   const sent=new Uint8Array(init.body);
   check(sent.every((b,i)=>b===pixels[i]),"image bytes changed");
   const headers=new Headers(init?.headers);
   check(headers.get("Content-Type")==="image/webp","bad MIME");
   check(headers.get("x-upsert")==="false","should not overwrite");
   check(headers.get("Authorization")==="Bearer example-secret","wrong server-side credentials");
   return new Response(null,{status:200});
 };
 await putPrivateImage({db:"https://example.supabase.co",serviceKey:"example-secret",
   bucket:"nongkum-activity-intake",path,bytes:pixels,mime:"image/webp",doFetch:mockedFetch});
 check(calls===1,"request was not issued");
});
Deno.test("unsafe destination, unsupported MIME or oversize are rejected before fetch",async()=>{
 let calls=0;
 const mockedFetch:typeof fetch=async()=>{calls++;return new Response(null,{status:200});};
 const bytes=new Uint8Array(1500);
 for(const props of [
   {path:"../meeting-evidence/a.webp",bucket:"nongkum-activity-intake",mime:"image/webp",bytes},
   {path,bucket:"meeting-evidence",mime:"image/webp",bytes},
   {path,bucket:"nongkum-activity-intake",mime:"image/svg+xml",bytes},
   {path,bucket:"nongkum-activity-intake",mime:"image/webp",bytes:new Uint8Array(350001)}
 ]){
   let denied=false;
   try{await putPrivateImage({db:"https://example.supabase.co",serviceKey:"test",...props,doFetch:mockedFetch});}
   catch(e){denied=e instanceof Error&&e.message==="invalid_image";}
   check(denied,"invalid upload was not rejected");
 }
 check(calls===0,"rejected uploads reached Storage");
});
Deno.test("failed Storage response is not treated as successful upload",async()=>{
 let failed=false;
 try{await putPrivateImage({db:"https://example.supabase.co",serviceKey:"example",
  bucket:"nongkum-activity-intake",path,bytes:new Uint8Array(1500),mime:"image/webp",
  doFetch:async()=>new Response(null,{status:403})});}
 catch(e){failed=e instanceof Error&&e.message==="upload_failed";}
 check(failed,"Storage rejection was ignored");
});
