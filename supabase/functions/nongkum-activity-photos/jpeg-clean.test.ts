import {cleanJpegMetadata} from "./jpeg-clean.ts";
function assert(x:boolean,msg:string):void {if(!x)throw Error(msg);}
function segment(marker:number,payload:number[]){const len=payload.length+2;return [255,marker,len>>8,len&255,...payload];}
function makeJpeg(metadata:boolean):Uint8Array{
 const sof=[8,0,120,0,160,3,1,0x11,0,2,0x11,1,3,0x11,1];
 const entropy=Array.from({length:1300},(_,i)=>(i%250)+1);
 return new Uint8Array([255,216,
  ...segment(0xe0,[74,70,73,70,0,1,2,3]),
  ...(metadata?[
   ...segment(0xe1,Array.from(new TextEncoder().encode("Exif\0\0GPS 123 secret"))),
   ...segment(0xe2,Array.from(new TextEncoder().encode("ICC_PROFILE private location"))),
   ...segment(0xfe,Array.from(new TextEncoder().encode("SECRET_LOCATION_COMMENT")))
  ]:[]),
  ...segment(0xdb,Array(65).fill(12)),
  ...segment(0xc0,sof),
  ...segment(0xc4,[1,2,3,4]),
  ...segment(0xda,[3,1,0,2,0,3,0,0,63,0]),
  ...entropy,255,217]);
}
Deno.test("Safari JPEG with EXIF, ICC and comment is normalized before private storage",()=>{
 const original=makeJpeg(true),sanitized=cleanJpegMetadata(original);
 const binary=new TextDecoder().decode(sanitized);
 assert(!binary.includes("GPS 123 secret"),"EXIF persisted");
 assert(!binary.includes("ICC_PROFILE"),"ICC persisted");
 assert(!binary.includes("SECRET_LOCATION_COMMENT"),"comment persisted");
 assert(!binary.includes("JFIF"),"JFIF metadata persisted");
 assert(sanitized.length<original.length,"no metadata removed");
 assert(sanitized[0]===255&&sanitized[1]===216&&sanitized.at(-2)===255&&sanitized.at(-1)===217,"invalid JPEG envelope");
 assert(sanitized.includes(0xc0)&&sanitized.includes(0xda),"pixels not preserved");
 assert(cleanJpegMetadata(sanitized).length===sanitized.length,"not idempotent");
});
Deno.test("already stripped JPEG is accepted without changing pixels",()=>{
 const baseline=makeJpeg(false);
 const normalized=cleanJpegMetadata(baseline);
 assert(normalized.length===baseline.length-12,"unexpected JPEG mutation"); // APP0(2+2+8)
});
Deno.test("invalid markers and dimensions are rejected",()=>{
 const cases:Uint8Array[]=[];
 const valid=makeJpeg(true);
 const damaged=new Uint8Array(valid);
 damaged[4]=0xff;damaged[5]=0xff;cases.push(damaged); // APP0 segment claims beyond input
 const noEoi=valid.subarray(0,valid.length-2);cases.push(noEoi);
 const huge=new Uint8Array(350001);huge.set(valid);huge.set([255,217],huge.length-2);cases.push(huge);
 const invalidDim=new Uint8Array(valid);
 const sofIndex=invalidDim.findIndex((v,i)=>v===255&&invalidDim[i+1]===0xc0);
 assert(sofIndex>0,"SOF not found");
 invalidDim[sofIndex+7]=0;invalidDim[sofIndex+8]=1;cases.push(invalidDim);
 for(const item of cases){
   let denied=false;
   try{cleanJpegMetadata(item);}catch(e){denied=e instanceof Error&&e.message==="invalid_image";}
   assert(denied,"malformed JPEG accepted");
 }
});
