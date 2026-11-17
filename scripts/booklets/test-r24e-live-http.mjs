#!/usr/bin/env node
/* R24-E1 production HTTP probe. No user data, no Google Drive requests, no auth. */
import {writeFileSync,mkdirSync} from "node:fs";
const base="https://infobwd.github.io/nongkum-sports-hub/";
const targets=[
 ["index.html","html","มิตรภาพ"],
 ["booklets.html","html","เอกสารสูจิบัตรสำหรับตรวจสอบ"],
 ["booklet-comparison.html","html","รายงานตรวจเทียบสูจิบัตร"],
 ["booklet-private-viewer.html","html","ตรวจรายการในเล่มรวม"],
 ["pdf-viewer.html","html","pdfCanvas"],
 ["committee-pdf-viewer.html","html","pdfCanvas"],
 ["data/booklet-versions.json","json",""],
 ["assets/souvenir-2569-v2.pdf","pdf",""],
 ["assets/souvenir-committee-2569-v3.pdf","pdf",""]
];
const evidence={
 schema_version:1,source:"github_pages_live_http_not_device_acceptance",
 checked_at:new Date().toISOString(),origin:base,checks:[]
};
for(const [path,kind,expected] of targets){
 let result={path,status:null,ok:false};
 try{
  const response=await fetch(new URL(path,base),{
   method:"GET",redirect:"follow",signal:AbortSignal.timeout(15000),
   headers:{"User-Agent":"nongkum-r24e-readonly-qa/1.0"}
  });
  result.status=response.status;
  result.content_type=response.headers.get("content-type")||"";
  result.url=response.url;
  if(kind==="html") {
   const body=await response.text();
   result.ok=response.ok && /text\/html/i.test(result.content_type) && body.includes(expected);
  } else if(kind==="json") {
   const obj=await response.json();
   result.ok=response.ok && obj.documents?.length===3 &&
     obj.documents[2].viewer_route===null &&
     obj.documents[2].document_status==="draft_review_not_approved";
  } else {
   // Check body magic without storing source PDF in this CI job.
   const bytes=new Uint8Array(await response.arrayBuffer());
   result.pdf_magic=String.fromCharCode(...bytes.slice(0,4));
   result.ok=response.ok && result.pdf_magic==="%PDF" && bytes.length>100000;
   result.size_bytes=bytes.length;
  }
 }catch(e){result.error=String(e);}
 evidence.checks.push(result);
 console.log((result.ok?"PASS ":"FAIL ")+path+" HTTP="+result.status);
}
evidence.pass_count=evidence.checks.filter(x=>x.ok).length;
evidence.fail_count=evidence.checks.length-evidence.pass_count;
evidence.overall=evidence.fail_count===0?"HTTP_OK_NOT_DEVICE_ACCEPTED":"HTTP_FAILED_OR_NOT_VERIFIED";
mkdirSync("r24e-browser-artifacts",{recursive:true});
writeFileSync("r24e-browser-artifacts/production-http-probe.json",JSON.stringify(evidence,null,2)+"\n");
console.log("R24-E production HTTP "+evidence.overall+" "+evidence.pass_count+"/"+evidence.checks.length);
if(evidence.fail_count)process.exitCode=1;
