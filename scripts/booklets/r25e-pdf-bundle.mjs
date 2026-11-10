import {readFileSync} from "node:fs";
import {createHash} from "node:crypto";

export const expectedPdfSha = "9da71db34f092a4a65a1ee2ea05984b343fc03097988854b1debe5251e2fae1a";
export const expectedBytes = 4229122;
export const parts = Object.freeze(Array.from({length:7},(_,i)=>
  "assets/r25d3-155pages/part-"+String(i+1).padStart(2,"0")+".b64"));

export function assembleR25E(){
  const buffers=parts.map((path,i)=>{
    const text=readFileSync(new URL("../../"+path,import.meta.url),"utf8");
    const base64=text.replace(/\s+/g,"");
    const expected=i===6?723632:819200;
    if(base64.length!==expected)throw Error("part_"+(i+1)+"_size");
    return Buffer.from(base64,"base64");
  });
  const pdf=Buffer.concat(buffers);
  if(pdf.length!==expectedBytes)throw Error("pdf_size");
  if(pdf.subarray(0,5).toString("ascii")!=="%PDF-")throw Error("not_pdf");
  const digest=createHash("sha256").update(pdf).digest("hex");
  if(digest!==expectedPdfSha)throw Error("pdf_sha_mismatch");
  return pdf;
}
