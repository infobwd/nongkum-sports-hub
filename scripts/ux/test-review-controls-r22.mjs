// R22: review uses shared controls, without interfering with the PDF comparison reader.
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import vm from "node:vm";
const read=p=>readFileSync(new URL("../../"+p,import.meta.url),"utf8");
const html=read("review.html"),back=read("js/back-to-top.js"),pull=read("js/pull-refresh.js");
const review=read("js/review.js"),style=read("css/review-controls.css");
const workflow=read(".github/workflows/validate.yml");
for(const path of ["css/back-to-top.css","css/pull-refresh.css","css/review-controls.css"])
 assert.ok(html.includes('href="./'+path+'?v=r22-review1"'),"missing review style: "+path);
for(const path of ["js/back-to-top.js","js/pull-refresh.js"])
 assert.ok(html.includes('src="./'+path+'?v=r22-review1"'),"missing review script: "+path);
assert.match(html,/id="reviewRefresh"[^>]*>↻ อัปเดต<\/button>/);
assert.match(review,/globalThis\.NongkumPageRefresh=\(\)=>ui\.pdfPreview\.hidden\?load\(\):Promise\.resolve\(false\)/);
assert.match(review,/if\(loading\)return false/);
assert.match(review,/return true;\s*}catch\(err\)/);
assert.match(review,/return false;\s*}finally/);
assert.match(review,/globalThis\.NongkumBackTopUpdate\?\.\(\)/);
assert.match(back,/reviewMain\.addEventListener\("scroll",update/);
assert.match(back,/reviewMain\.scrollTo\(\{top:0,behavior\}\)/);
assert.match(pull,/function reviewPdfOpen\(\)/);
assert.match(style,/right:calc\(57vw \+ 12px\)/);
assert.match(style,/max-width:1000px/);
assert.match(workflow,/test-review-controls-r22\.mjs/);
for(const src of [back,pull,review])new vm.Script(src);

function makeNode(){
 const styles={},classes=new Set();
 return {handlers:{},hidden:false,textContent:"",innerHTML:"",type:"",
  setAttribute(){},getBoundingClientRect(){return {width:360,height:82,top:718,bottom:800};},
  addEventListener(type,fn){this.handlers[type]=fn;},
  style:{setProperty(k,v){styles[k]=v;}},
  classList:{add(...names){names.forEach(n=>classes.add(n));},
   remove(...names){names.forEach(n=>classes.delete(n));},
   toggle(name,force){
    if(force===undefined?!classes.has(name):force){classes.add(name);return true;}
    classes.delete(name);return false;
   },contains(name){return classes.has(name);}}
 };
}
const stored={},docHandlers={},winHandlers={};
const body=makeNode(),main=makeNode(),nav=makeNode(),header=makeNode();
body.dataset={view:"review"};
body.appendChild=node=>{if(node.id)stored[node.id]=node;};
body.append=(...nodes)=>nodes.forEach(n=>{stored[n.className]=n;});
main.scrollTop=0;
main.scrollTo=({top})=>{main.scrollTop=top;};
header.getBoundingClientRect=()=>({bottom:56});
let desktop=false,refreshCalls=0;
const window={
 innerHeight:800,scrollY:0,
 matchMedia:q=>({matches:q.includes("min-width:1001px")?desktop:false}),
 scrollTo:({top})=>{window.scrollY=top;},
 addEventListener:(type,fn)=>{winHandlers[type]=fn;},
 NongkumPageRefresh:async()=>{refreshCalls++;return true;}
};
const document={
 body,documentElement:{scrollTop:0},
 getElementById:id=>id==="reviewMain"?main:stored[id]||null,
 querySelector:query=>query===".mobile-nav"?nav:query==="header.top"?header:null,
 createElement:()=>makeNode(),
 addEventListener:(type,fn)=>{docHandlers[type]=fn;}
};
const sandbox=vm.createContext({
 window,document,getComputedStyle:()=>({display:desktop?"none":"grid"}),
 setTimeout:()=>1,clearTimeout:()=>{}
});
new vm.Script(back).runInContext(sandbox);
new vm.Script(pull).runInContext(sandbox);
const button=stored.sharedBackTop;
assert.ok(button&&button.hidden,"back-to-top initially hidden");
assert.ok(stored["shared-pull-hint"],"shared pull hint installed");
assert.equal(typeof window.NongkumBackTopUpdate,"function");

window.scrollY=420;winHandlers.scroll();
assert.equal(button.hidden,false,"normal review scroll shows button");
assert.match(button.style.bottom,/px/,"clearance above mobile tabs");
button.handlers.click();
assert.equal(window.scrollY,0,"normal click returns document to top");
winHandlers.scroll();
assert.equal(button.hidden,true,"button hides at document top");

desktop=true;body.classList.add("review-pdf-open");main.scrollTop=450;
window.NongkumBackTopUpdate();
assert.equal(button.hidden,false,"desktop split view shows back button for left review column");
button.handlers.click();
assert.equal(main.scrollTop,0,"desktop back-to-top scrolls review list");
assert.equal(window.scrollY,0,"desktop back-to-top must not scroll right PDF or document");
main.scrollTop=350;main.handlers.scroll();
assert.equal(button.hidden,false,"desktop review pane scroll event updates visibility");

// No pull-to-refresh when a PDF comparison pane is open.
function touchStart(){docHandlers.touchstart({touches:[{clientX:0,clientY:80}],
 target:{closest(){return null;}}});}
function touchMove(){const event={touches:[{clientX:0,clientY:250}],cancelable:true,
 preventDefault(){event.prevented=true;}};docHandlers.touchmove(event);return event;}
touchStart();
assert.equal(touchMove().prevented,undefined,"desktop split PDF must not capture pull gesture");
await docHandlers.touchend();
assert.equal(refreshCalls,0);

desktop=false;window.NongkumBackTopUpdate();
assert.equal(button.hidden,true,"full-screen PDF hides back-to-top");
touchStart();
assert.equal(touchMove().prevented,undefined,"mobile PDF must not capture pull gesture");
await docHandlers.touchend();
assert.equal(refreshCalls,0);

body.classList.remove("review-pdf-open");window.NongkumBackTopUpdate();
touchStart();
assert.equal(touchMove().prevented,true,"normal page pull shows gesture hint");
await docHandlers.touchend();
assert.equal(refreshCalls,1,"normal review pull loads once through shared callback");
window.scrollY=120;touchStart();touchMove();await docHandlers.touchend();
assert.equal(refreshCalls,1,"pull only starts at page top");
console.log("PASS R22: shared review controls, mobile modal guard, desktop independent scroll, pull trigger and retry bridge");
