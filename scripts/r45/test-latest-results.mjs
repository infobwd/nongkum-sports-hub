// R45: Approved-only results use the real per-result publication time across all sports.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const read = path => readFileSync(new URL('../../' + path, import.meta.url), 'utf8');
const sourceText = read('js/results-source-r32.js');
const rendererText = read('js/results-renderers.js');
const page = read('results.html');
const pageJS = read('js/results.js');
const styles = read('css/results.css');

const sports = ['football','shootout','futsal','volleyball','petanque','tabletennis','takraw','tugofwar','athletics'];
const schoolIds = ['school-a', 'school-b'];
const schools = schoolIds.map(id => ({id, short:id}));
const sportCatalog = sports.map(id => ({id, name:id, emoji:''}));
const backupEmpty = {
  schema_version:1,
  metadata:{approved_only:true,publication_status:'empty',approved_results_count:0,published_at:null},
  schools, sports:sportCatalog, results:[]
};
const buildResult = (sport, i) => {
  const common = {id:'r'+i,status:'approved',sport_id:sport,division:'12 ปี ชาย'};
  if(i % 4 === 0)return {...common,result_type:'ranking',event_id:'event'+i,rankings:[{rank:1,school_id:'school-a'}]};
  if(i % 4 === 1)return {...common,result_type:'score',fixture_id:'fixture'+i,team_a_id:'school-a',team_b_id:'school-b',score_a:1,score_b:0};
  if(i % 4 === 2)return {...common,result_type:'sets',fixture_id:'fixture'+i,team_a_id:'school-a',team_b_id:'school-b',sets:[{a:25,b:22}]};
  return {...common,result_type:'win_loss',fixture_id:'fixture'+i,team_a_id:'school-a',team_b_id:'school-b',winner_school_id:'school-a'};
};
const row = (sport, i, minute=i) => ({
  result_id:'r'+i,revision:1,result:buildResult(sport,i),
  published_at:new Date(Date.UTC(2026,10,17,8,minute)).toISOString()
});
let rows = sports.map((sport,i) => row(sport,i));
rows.push(row('football',9,9));
let offline = false;
let backup = backupEmpty;
const fetchMock = async input => {
  const path=String(input);
  if(path.includes('/rest/v1/')) {
    if(offline)throw Error('offline');
    return {ok:true,json:async()=>rows};
  }
  if(path.includes('public-results.json'))return {ok:true,json:async()=>backup};
  throw Error('Unexpected URL: '+path);
};
const sourceGlobal = {fetch:fetchMock,setTimeout,clearTimeout,AbortController};
sourceGlobal.globalThis = sourceGlobal;
vm.runInNewContext(sourceText,sourceGlobal,{filename:'results-source-r32.js'});
const feed=sourceGlobal.NongkumResultSource;
assert(feed && typeof feed.load === 'function');
assert(sourceText.includes('order=published_at.desc'));
assert(sourceText.includes('published_at:row.published_at'));

const live=await feed.load();
assert.equal(live.source,'live');
assert.equal(live.data.metadata.approved_results_count,10);
assert.equal(live.data.metadata.published_at,rows[9].published_at);
assert.deepEqual(Array.from(live.data.results,r=>r.id),['r9','r8','r7','r6','r5','r4','r3','r2','r1','r0']);
assert(live.data.results.every(r=>r.status==='approved'));
assert.equal(new Set(live.data.results.map(r=>r.sport_id)).size,9);
assert.equal(new Set(live.data.results.map(r=>r.result_type)).size,4);
assert.deepEqual(Array.from(live.data.results.filter(r=>r.sport_id==='football'),r=>r.id),['r9','r0']);

rows=rows.map(r=>r.result_id==='r0'?{...r,revision:2,published_at:new Date(Date.UTC(2026,10,17,8,40)).toISOString()}:r);
const revised=await feed.load();
assert.equal(revised.data.results[0].id,'r0');
assert.equal(revised.data.results[0].share_revision,2);
assert.equal(revised.data.results[0].published_at,rows[0].published_at);
assert.deepEqual(Array.from(revised.data.results.filter(r=>r.sport_id==='football'),r=>r.id),['r0','r9']);

rows=[...rows,{...row('football',10,41),result:{...buildResult('football',10),status:'draft'}}];
await assert.rejects(()=>feed.load(),/Invalid approved Supabase row/);
rows=rows.slice(0,-1);

backup={...backupEmpty,metadata:{approved_only:true,publication_status:'published',approved_results_count:1,published_at:null},
        results:[buildResult('football',1)]};
offline=true;
const fallback=await feed.load();
assert.equal(fallback.source,'backup');
assert.equal(fallback.data.results.length,1);
assert.equal('published_at' in fallback.data.results[0],false);

const uiGlobal={Nongkum:{escapeHtml:value=>String(value)}};
uiGlobal.globalThis=uiGlobal;
vm.runInNewContext(rendererText,uiGlobal,{filename:'results-renderers.js'});
for(const result of revised.data.results) {
  const html=uiGlobal.NongkumResultsRender.card(result,schools,sportCatalog,new Map(),new Map());
  assert(html.includes('รับรองแล้ว'));
  assert(html.includes('เผยแพร่ '));
  assert(html.includes('data-share-result='));
}
const backupHtml=uiGlobal.NongkumResultsRender.card(fallback.data.results[0],schools,sportCatalog,new Map(),new Map());
assert(!backupHtml.includes('เผยแพร่ '));

const subnav=page.match(/<nav class="results-subnav"[\s\S]*?<\/nav>/)?.[0] ?? '';
assert.equal((subnav.match(/<a\b/g)||[]).length,2);
assert(!subnav.includes('ภาพกิจกรรม'));
assert(page.match(/<nav id="mobileTabNav"[\s\S]*?<\/nav>/)?.[0].includes('activity-photos.html'));
assert(page.includes('ผลการแข่งขันล่าสุด'));
assert(page.includes('ปัดดูเพิ่มเติม'));
assert(page.includes('results.js?v=r45-1'));
assert(pageJS.includes('ข้อมูลสำรอง · ไม่สามารถยืนยันเวลาเผยแพร่ล่าสุดได้'));
assert(pageJS.includes('els.countSummary.hidden=!filtered&&!stale'));
assert(styles.includes('.result-filter-state[hidden]'));
assert(!styles.includes('\\n/* R45'));
console.log('PASS R45: 9 sports, 4 shapes, live order, filtered order, revision, approved-only, backup, renderer, mobile navigation');
