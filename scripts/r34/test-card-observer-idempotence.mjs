#!/usr/bin/env node
// Regression: MutationObserver watches card childList/subtree; annotate() must
// not mutate already-current content or it schedules itself indefinitely.
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const src = fs.readFileSync(new URL("../../js/r34-card-editor.js", import.meta.url), "utf8");
const start = src.indexOf("function annotate(){");
const end = src.indexOf('document.addEventListener("click",', start);
assert.ok(start >= 0 && end > start, "R34 annotate() must be present");

let mutations = 0;
class Node {
  constructor(tag) {
    this.tag=tag;
    this.dataset={};
    this.children=[];
    this.parentElement=null;
    this.className="";
    this.classList={add:name=>{this.className=name;}};
    this._text="";
  }
  set textContent(value) {
    this._text=String(value);
    // Even replacing with identical text triggers childList mutations in browsers.
    mutations++;
  }
  get textContent() {return this._text;}
  appendChild(node) {
    node.parentElement=this;
    this.children.push(node);
    mutations++;
    return node;
  }
  insertBefore(node, before) {
    node.parentElement=this;
    const at=before?this.children.indexOf(before):-1;
    if(at>=0)this.children.splice(at,0,node);
    else this.children.push(node);
    mutations++;
    return node;
  }
  querySelector(selector) {
    const cls=selector.slice(1);
    const find=(node)=>{
      for(const child of node.children){
        if(child.className===cls)return child;
        const nested=find(child);
        if(nested)return nested;
      }
      return null;
    };
    return find(this);
  }
  hasAttribute(name) {return name==="data-fixture-card"&&!!this.dataset.fixtureCard;}
}
const fixture=new Node("article");
fixture.dataset.fixtureCard="fixture-a";
const result=new Node("article");
result.dataset.resultCard="result-fixture-b";
const state={approved:new Map([
  ["fixture-a",{winner_school_id:"wangdong",result_type:"win_loss"}],
  ["fixture-b",{winner_school_id:"wangdong",result_type:"win_loss"}]
])};
const document={
  createElement:tag=>new Node(tag),
  querySelectorAll:selector=>{
    assert.equal(selector,"[data-fixture-card],[data-result-card]");
    return [fixture,result];
  }
};
const annotate=vm.runInNewContext(
  src.slice(start,end)+"\nannotate",
  {state,document,school:id=>id==="wangdong"?"วังด้ง":"เสาหงส์"}
);
annotate();
assert.match(fixture.querySelector(".r34-approved-label").textContent,/วังด้ง/);
assert.equal(result.querySelector(".r34-edit-button").textContent,"✎ แก้ไขผล");
const first=mutations;
assert.ok(first>0);
annotate();
annotate();
assert.equal(mutations,first,"Repeated annotation must cause zero card mutations (no observer loop)");
state.approved.get("fixture-a").winner_school_id="saohong";
annotate();
assert.ok(mutations>first,"Changing an actual result updates the label");
const changed=mutations;
assert.match(fixture.querySelector(".r34-approved-label").textContent,/เสาหงส์/);
annotate();
assert.equal(mutations,changed,"Updated text must stabilize after one pass");
console.log("R34 card annotation idempotence and result-change regression passed");
