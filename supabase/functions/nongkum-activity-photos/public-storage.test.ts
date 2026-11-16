import {putPublishedImage,removePublishedImage} from "./public-storage.ts";
const bucket="nongkum-activity-public";
const path="media/11111111-2222-4333-8444-555555555555.webp";
const bytes=Uint8Array.from({length:2048},(_,i)=>i%251);
function ensure(value:unknown,label:string):asserts value{
 if(!value)throw Error(label);
}
Deno.test("R40-G copies actual 2048 image bytes with strict public bucket and cache zero",async()=>{
 let calls=0;
 const mock=async(url:RequestInfo|URL,options?:RequestInit)=>{
   calls++;
   ensure(String(url).endsWith("/storage/v1/object/"+bucket+"/"+path),"public path");
   ensure(options?.method==="POST","POST");
   ensure(options?.body instanceof ArrayBuffer,"binary ArrayBuffer body");
   const output=new Uint8Array(options.body);
   ensure(output.length===bytes.length,"body length");
   ensure(output.every((v,i)=>v===bytes[i]),"image bytes preserved");
   const headers=options.headers as Record<string,string>;
   ensure(headers["cache-control"]==="0","revoke-friendly cache");
   ensure(headers["x-upsert"]==="false","no silent overwrite");
   ensure(headers["Content-Type"]==="image/webp","content type");
   return new Response("{}",{status:200});
 };
 await putPublishedImage({db:"https://test.invalid",serviceKey:"test",bucket,path,
   bytes,mime:"image/webp",doFetch:mock as typeof fetch});
 ensure(calls===1,"write call count");
});
Deno.test("R40-G refuses private bucket, private path and mismatched MIME before network",async()=>{
 let calls=0;
 const mock=async()=>{calls++;return new Response("",{status:200})};
 for(const input of [
   {bucket:"nongkum-activity-intake",path,mime:"image/webp"},
   {bucket,path:"uploads/11111111-2222-4333-8444-555555555555.webp",mime:"image/webp"},
   {bucket,path,mime:"image/jpeg"}
 ]){
   let failed=false;
   try{await putPublishedImage({db:"https://test.invalid",serviceKey:"test",
     ...input,bytes,doFetch:mock as typeof fetch});}
   catch(_){failed=true;}
   ensure(failed,"unsafe public image rejected");
 }
 ensure(calls===0,"unsafe values should never contact storage");
});
Deno.test("R40-G revoke cleanup is repeatable for missing objects, but rejects private paths",async()=>{
 let requests=0;
 const mock=async(_url:RequestInfo|URL,options?:RequestInit)=>{
   requests++;ensure(options?.method==="DELETE","DELETE");
   return new Response("",{status:404});
 };
 const removed=await removePublishedImage({db:"https://test.invalid",serviceKey:"test",
  bucket,path,doFetch:mock as typeof fetch});
 ensure(removed===true&&requests===1,"404 is already removed");
 let failed=false;
 try{await removePublishedImage({db:"https://test.invalid",serviceKey:"test",
   bucket,path:"uploads/private.jpg",doFetch:mock as typeof fetch});}
 catch(_){failed=true;}
 ensure(failed&&requests===1,"cannot delete private input path");
});
