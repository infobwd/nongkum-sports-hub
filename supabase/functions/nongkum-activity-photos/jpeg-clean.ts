/** R40-F — normalize iOS Safari canvas JPEG without retaining APP/COM metadata. */
export function cleanJpegMetadata(input:Uint8Array):Uint8Array {
 if(input.byteLength<1000||input.byteLength>350000||
   input[0]!==0xff||input[1]!==0xd8||
   input[input.length-2]!==0xff||input[input.length-1]!==0xd9)
   throw Error("invalid_image");
 const parts:Uint8Array[]=[input.subarray(0,2)];
 let at=2,frame=false,segments=0;
 while(at+4<=input.length){
   const start=at;
   if(input[at]!==0xff)throw Error("invalid_image");
   while(input[at]===0xff)at++;
   if(at>=input.length)throw Error("invalid_image");
   const marker=input[at++];
   if(marker===0xd8||marker===0xd9||marker===0x00||
      marker===0x01||(marker>=0xd0&&marker<=0xd7))throw Error("invalid_image");
   if(at+2>input.length)throw Error("invalid_image");
   const length=(input[at]<<8)|input[at+1],end=at+length;
   if(length<2||end>input.length||++segments>80)throw Error("invalid_image");
   if(marker===0xda){
     // SOS and entropy stream follow; preserve compressed pixels verbatim.
     if(!frame||length<6||end>=input.length-2)throw Error("invalid_image");
     parts.push(input.subarray(start));
     const total=parts.reduce((n,p)=>n+p.length,0);
     if(total<1000||total>350000)throw Error("invalid_image");
     const out=new Uint8Array(total);
     let offset=0;
     for(const part of parts){out.set(part,offset);offset+=part.length;}
     return out;
   }
   if(marker===0xc0||marker===0xc2){
     if(length<8||frame)throw Error("invalid_image");
     const height=(input[at+3]<<8)|input[at+4];
     const width=(input[at+5]<<8)|input[at+6];
     if(width<80||height<80||width>1600||height>1200)throw Error("invalid_image");
     frame=true;
   }else if(marker!==0xdb&&marker!==0xc4&&marker!==0xdd &&
           !(marker>=0xe0&&marker<=0xef) && marker!==0xfe){
     throw Error("invalid_image");
   }
   // Strip APP0-APP15 and COM, including ICC/XMP/EXIF inserted by Safari.
   // Do not simply allow these chunks to pass to private Storage.
   if(!(marker>=0xe0&&marker<=0xef)&&marker!==0xfe)
     parts.push(input.subarray(start,end));
   at=end;
 }
 throw Error("invalid_image");
}
