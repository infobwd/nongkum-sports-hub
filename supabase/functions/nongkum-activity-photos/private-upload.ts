/** R40 private uploads: this module never runs in a public browser. */
export async function putPrivateImage({
 db,serviceKey,bucket,path,bytes,mime,doFetch=fetch
}:{
 db:string;serviceKey:string;bucket:string;path:string;
 bytes:Uint8Array;mime:string;doFetch?:typeof fetch;
}):Promise<void>{
 if(!/^uploads\/[0-9a-f-]{36}\.(webp|jpg)$/.test(path) ||
    bucket!=="nongkum-activity-intake" ||
    !["image/webp","image/jpeg"].includes(mime) ||
    bytes.byteLength<1000 || bytes.byteLength>350000)throw Error("invalid_image");
 // A definite ArrayBuffer is accepted by Deno fetch BodyInit and preserves the image bytes.
 const body=new Uint8Array(bytes).buffer;
 const r=await doFetch(db+"/storage/v1/object/"+bucket+"/"+path,{
   method:"POST",
   headers:{
     "apikey":serviceKey,"Authorization":"Bearer "+serviceKey,
     "Content-Type":mime,"cache-control":"no-store","x-upsert":"false"
   },
   body,signal:AbortSignal.timeout(20000)
 });
 if(!r.ok)throw Error("upload_failed");
}
