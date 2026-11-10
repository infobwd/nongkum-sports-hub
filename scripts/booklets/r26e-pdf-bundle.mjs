import {readFileSync} from "node:fs";
import {createHash} from "node:crypto";
export const PDF_SHA="40d04daba7c1b7b5d655e6973989bec54c89c84a7b2832ba4700cd81f059b84f";
export const PDF_BYTES=1271633;
export const PATHS=Object.freeze([1,2,3].map(n=>"assets/r26d-v2-41pages/part-"+String(n).padStart(2,"0")+".b64"));
export function assembleR26E() {
 const chunks=PATHS.map((path,i)=>{
  const text=readFileSync(new URL("../../"+path,import.meta.url),"utf8");
  const base64=text.replace(/\s+/g,"");
  const expected=[600000,600000,495512][i];
  if(base64.length!==expected)throw Error("chunk_length_"+(i+1));
  const bytes=Buffer.from(base64,"base64");
  if(bytes.length!==[450000,450000,371633][i])throw Error("chunk_decoded_"+(i+1));
  return bytes;
 });
 const pdf=Buffer.concat(chunks);
 if(pdf.length!==PDF_BYTES || pdf.toString("ascii",0,5)!=="%PDF-")throw Error("PDF_bytes_or_header");
 if(createHash("sha256").update(pdf).digest("hex")!==PDF_SHA)throw Error("PDF_revision_changed");
 return pdf;
}
