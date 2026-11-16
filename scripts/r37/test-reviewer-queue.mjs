#!/usr/bin/env node
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import vm from "node:vm";
const read=p=>readFileSync(new URL("../../"+p,import.meta.url),"utf8");
const html=read("review-results.html"),js=read("js/review-results.js"),
 css=read("css/review-results.css"),sql=read("supabase/migrations/20261116120000_r37_reviewer_queue.sql"),
 api=read("supabase/functions/nongkum-results-reviewer/index.ts");
const index=read("index.html"),results=read("results.html");
new vm.Script(js,{filename:"review-results.js"});
assert.match(html,/<meta name="robots" content="noindex,nofollow">/);
assert.match(index,/href="\.\/review-results\.html"/);
assert.match(results,/href="\.\/review-results\.html"/);
for(const id of ["reviewerUnlock","reviewerWorkspace","reviewerLoginForm","reviewerQueue","reviewerEmpty",
  "reviewerStatus","reviewerSport","reviewerPendingCount","reviewerApprovedCount","reviewerReturnedCount"]){
 assert.match(html,new RegExp('id="'+id+'"'),"missing "+id);
}
assert.match(css,/grid-template-columns/);
assert.match(css,/min-height:44px/);
assert.match(js,/setInterval\(.+30000\)/s);
assert.match(js,/expected_revision/);
assert.match(js,/data-confirm-panel/);
assert.match(js,/state\.busy=false;\s*await loadQueue\(true\)/);
assert.match(api,/ALLOWED_ORIGINS/);
assert.match(api,/SUPABASE_SERVICE_ROLE_KEY/);
assert.match(api,/nongkum_reviewer_gateway/);
assert.match(api,/authorization/);
assert.match(sql,/create table if not exists nongkum_sports\.reviewer_access_config/i);
assert.match(sql,/revoke all on function public\.nongkum_reviewer_gateway/i);
assert.match(sql,/grant execute on function public\.nongkum_reviewer_gateway\(text,jsonb\) to service_role/i);
assert.match(sql,/nongkum_sports\.approve_and_publish/);
assert.match(sql,/result_reviewer_actions/);
assert.doesNotMatch(js,/SERVICE_ROLE_KEY|PIN_HASH|SUPABASE_SECRET/);
assert.doesNotMatch(api,/\bconst\s+(PIN|REVIEWER_PIN)\s*=/);
assert.doesNotMatch(sql,/insert\s+into\s+nongkum_sports\.reviewer_access_config/i);
console.log("R37 reviewer queue static/security regression passed");
