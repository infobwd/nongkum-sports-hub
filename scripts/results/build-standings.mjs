import {readFileSync,writeFileSync,existsSync} from "node:fs";
import {buildSnapshot,validateSnapshot} from "./standings-validation.mjs";
const read=p=>JSON.parse(readFileSync(p,"utf8"));
const data=read("data/public-results.json"),program=read("data/program-from-pdf-2569-20261104-draft.json");
const rules=read("data/standings-rules.json");
const snapshot=buildSnapshot(data,program,rules);
const path="data/public-standings.json";
if(process.argv.includes("--check")){
  if(!existsSync(path)){
    if(snapshot.standings.length)throw Error("Committed snapshot missing for approved rules");
    console.log("R15-C PASS: no standings published while rules await committee approval");
  }else{
    const problems=validateSnapshot(read(path),data,program,rules);
    if(problems.length)throw Error(problems.map(x=>x.code).join(", "));
    console.log("R15-C PASS: deterministic snapshot and digests match");
  }
}else if(process.argv.includes("--write")){
  if(!snapshot.standings.length)throw Error("Publication blocked: no fully approved standings rules");
  writeFileSync(path,JSON.stringify(snapshot,null,2)+"\n","utf8");
  console.log("Wrote verified derived snapshot "+path);
}else{
  console.log(JSON.stringify(snapshot,null,2));
}
