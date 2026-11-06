// R19-D: encrypted school roster / LINE confirmation regression and privacy gate.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { webcrypto, randomBytes } from "node:crypto";
import { gzipSync } from "node:zlib";
const read=p=>readFileSync(new URL("../../"+p,import.meta.url),"utf8");
const html=read("committee-review.html");
const js=read("js/committee-review.js");
const css=read("css/committee-review.css");
const committee=read("committee.html");
const program=JSON.parse(read("data/program-from-pdf-2569-20261104-draft.json"));
const raw=read("data/committee-school-rosters-2569.encrypted.json");
const manifest=JSON.parse(raw);
assert.equal(manifest.schema_version,1);
assert.equal(manifest.publication_scope,"encrypted_school_draft_only");
assert.equal(manifest.cipher,"AES-256-GCM");
assert.equal(manifest.kdf,"PBKDF2-SHA256");
assert.equal(manifest.compression,"gzip");
assert.equal(manifest.rounds,210000);
assert.equal(manifest.revision,"R19D-2569-20261106-v1");
assert.equal(manifest.schools.length,8);
assert.equal(new Set(manifest.schools.map(s=>s.id)).size,8);
assert.equal(manifest.schools.reduce((n,s)=>n+s.count,0),209);
assert.ok(manifest.schools.every(x=>x.salt&&x.iv&&x.ct&&!x.code&&!x.password&&!x.rows));
for(const secret of ['"name_as_printed"','"raw_text"','"passphrase"','"school_code"','"teacher_id"', 'นายนพรุจ', 'นางสาวอมรา']){
 assert.ok(!raw.includes(secret),"private content must never appear in public encrypted file");
}
assert.match(committee,/committee-review\.html/);
for(const id of ["schoolReviewRoot","crSchool","crCode","crUnlock","crPrivate","crEntries","crReviewer","crShareLine","crCopy","crConfirmReviewed"]){
 assert.ok(html.includes('id="'+id+'"'),"missing accessible UI target "+id);
}
assert.match(html,/ไม่ใช่คำสั่งแต่งตั้ง/);
assert.match(css,/min-height:48px/);
assert.match(css,/safe-area-inset-bottom/);
assert.match(js,/AES-GCM/);
assert.match(js,/PBKDF2/);
assert.match(js,/DecompressionStream/);
assert.match(js,/https:\/\/line\.me\/R\/msg\/text\//);
assert.doesNotMatch(js,/innerHTML|localStorage|sessionStorage|document\.cookie/);
assert.equal(program.fixtures.length,237);
const ctx=vm.createContext({
 atob:s=>Buffer.from(s,"base64").toString("binary"),
 crypto:webcrypto, TextEncoder, TextDecoder,
 DecompressionStream, Blob, Response, Uint8Array, URLSearchParams
});
new vm.Script(js,{filename:"committee-review.js"}).runInContext(ctx);
const api=ctx.NongkumSchoolCommittee;
assert.equal(api.codeNormal(" ABCDE-23456-FGHIJ "),"ABCDE23456FGHIJ");
const source={v:1,revision:"fixture-v1",school_id:"schoolx",name:"โรงเรียนทดสอบ",source_sha256:"e".repeat(64),
sections:{"1":"ฝ่ายจัด"},rows:[
 ["R1","1.1","คนทดสอบ 1","โรงเรียนทดสอบ","ประธาน","1",null,6,[]],
 ["R2","1.2","คนทดสอบ 2","โรงเรียนทดสอบ","กรรมการ","1",null,6,[]]
]};
const code="TESTCODE-12345-SAFEX";
const salt=randomBytes(16),iv=randomBytes(12);
const pass=await webcrypto.subtle.importKey("raw",new TextEncoder().encode(api.codeNormal(code)),{name:"PBKDF2"},false,["deriveKey"]);
const key=await webcrypto.subtle.deriveKey({name:"PBKDF2",salt,iterations:210000,hash:"SHA-256"},pass,{name:"AES-GCM",length:256},false,["encrypt","decrypt"]);
const compressed=gzipSync(Buffer.from(JSON.stringify(source),"utf8"));
const encrypted=await webcrypto.subtle.encrypt({name:"AES-GCM",iv,additionalData:new TextEncoder().encode("fixture-v1|schoolx")},key,compressed);
const sample={schema_version:1,revision:"fixture-v1",source_sha256:source.source_sha256,
cipher:"AES-256-GCM",kdf:"PBKDF2-SHA256",compression:"gzip",rounds:210000,schools:[
 {id:"schoolx",count:2,salt:Buffer.from(salt).toString("base64"),iv:Buffer.from(iv).toString("base64"),ct:Buffer.from(encrypted).toString("base64")}
]};
await assert.rejects(api.unlockBundle(sample,"schoolx","INVALID-PASSWORD"));
const saved=await api.unlockBundle(sample,"schoolx",code);
assert.equal(saved.rows.length,2);
assert.equal(saved.rows[1][0],"R2");
assert.throws(()=>api.buildConfirmation(saved,{},"คนตรวจ", ""),/incomplete/);
assert.throws(()=>api.buildConfirmation(saved,{"R1":{status:"correct"},"R2":{status:"change"}},"คนตรวจ",""),/missing_note/);
const output=api.buildConfirmation(saved,{"R1":{status:"correct"},"R2":{status:"change",note:"แก้ตัวสะกด"}},"ผู้ตรวจโรงเรียน","ขอแก้ไข");
assert.match(output,/รอ|กรุณาผู้จัด/);
assert.match(output,/R2/);
assert.match(output,/fixture-v1/);
assert.ok(!output.includes("คนทดสอบ 1"),"LINE should transmit stable IDs rather than full roster");
const ok=api.buildConfirmation(saved,{"R1":{status:"correct"},"R2":{status:"correct"}},"ผู้ตรวจโรงเรียน","");
assert.match(ok,/ตรวจแล้วถูกต้องตามร่าง/);
console.log("R19-D PASS: 8 encrypted schools, 209 rows, actual test-key decrypt, no plaintext names, honest LINE review, legacy program 237 unchanged");
