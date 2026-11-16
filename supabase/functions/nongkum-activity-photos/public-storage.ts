/** R40-G public photo gateway: only the server can copy explicitly authorized images.
 * No storage object may be written directly by anonymous browsers. */
export async function putPublishedImage({
 db,serviceKey,bucket,path,bytes,mime,doFetch=fetch
}:{
 db:string;serviceKey:string;bucket:string;path:string;
 bytes:Uint8Array;mime:string;doFetch?:typeof fetch;
}):Promise<void>{
 if(bucket!=="nongkum-activity-public"||
    !/^media\/[0-9a-f-]{36}\.(webp|jpg)$/.test(path)||
    !["image/webp","image/jpeg"].includes(mime)||
    (mime==="image/webp"&&!path.endsWith(".webp"))||
    (mime==="image/jpeg"&&!path.endsWith(".jpg"))||
    bytes.byteLength<1000||bytes.byteLength>350000)
     throw Error("invalid_image");
 const body=new Uint8Array(bytes).buffer;
 const r=await doFetch(db+"/storage/v1/object/"+bucket+"/"+path,{
   method:"POST",headers:{
     apikey:serviceKey,Authorization:"Bearer "+serviceKey,
     "Content-Type":mime,"cache-control":"0","x-upsert":"false"
   },body,signal:AbortSignal.timeout(20000)
 });
 if(!r.ok)throw Error("upload_failed");
}
export async function removePublishedImage({
 db,serviceKey,bucket,path,doFetch=fetch
}:{
 db:string;serviceKey:string;bucket:string;path:string;doFetch?:typeof fetch;
}):Promise<boolean>{
 if(bucket!=="nongkum-activity-public"||
    !/^media\/[0-9a-f-]{36}\.(webp|jpg)$/.test(path))
      throw Error("invalid");
 const r=await doFetch(db+"/storage/v1/object/"+bucket+"/"+path,{
   method:"DELETE",headers:{apikey:serviceKey,Authorization:"Bearer "+serviceKey},
   signal:AbortSignal.timeout(12000)
 });
 return r.ok||r.status===404;
}
