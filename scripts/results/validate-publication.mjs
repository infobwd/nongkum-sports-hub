import {readFileSync,existsSync} from "node:fs";
import {execFileSync} from "node:child_process";
import {validatePublication,validateSnapshot,buildSnapshot} from "./standings-validation.mjs";
const read=p=>JSON.parse(readFileSync(p,"utf8"));
const results=read("data/public-results.json"),program=read("data/program-from-pdf-2569-20261104-draft.json");
const rules=read("data/standings-rules.json");
let previous=null;
if(process.argv.includes("--against-origin-main")){
  try{previous=JSON.parse(execFileSync("git",["show","origin/main:data/public-results.json"],{encoding:"utf8"}));}
  catch(e){console.error("Cannot read origin/main baseline; fail closed:",e.message);process.exit(1);}
}
const errors=validatePublication(results,program,rules,{previous});
const path="data/public-standings.json";
const expected=errors.length?null:buildSnapshot(results,program,rules);
if(existsSync(path)){
  errors.push(...validateSnapshot(read(path),results,program,rules));
}else if(expected?.standings?.length){
  errors.push({code:"SNAPSHOT_REQUIRED",message:"approved rules need a committed, verified snapshot"});
}
if(errors.length){for(const e of errors)console.error(e.code+": "+e.message);process.exit(1);}
console.log("R15-C PASS: approved public JSON validated; football phase map locked; "+results.results.length+" results; snapshot "+(existsSync(path)?"verified":"not yet published (no approved rule)")+".");
