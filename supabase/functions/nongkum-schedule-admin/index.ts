import "jsr:@supabase/functions-js/edge-runtime.d.ts";
// R43-F: personal-PIN staff-session schedule review, NOT R33 activation.
// Fail closed unless staff actor migration + security QA + explicit gate are complete.
const DB=Deno.env.get("SUPABASE_URL")??"";
const SERVICE=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")??"";
const ENABLED=Deno.env.get("R43_STAFF_GATEWAY_ENABLED")==="true";
const ALLOWED=new Set(["https://infobwd.github.io"]);
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ACTIONS=new Set([
  "status","people","people_pending","person_propose","person_review",
  "queue","submit","review","approved_preview",
  "new_submit","new_queue","new_review"
]);
// A personal opaque token maps to the R43 actor via an isolated, private
// session-verification RPC. Never accept caller-supplied staff IDs or names.
const textEncoder=new TextEncoder();
async function sha256(input:string){
  return Array.from(new Uint8Array(await crypto.subtle.digest(
    "SHA-256",textEncoder.encode(input))),b=>b.toString(16).padStart(2,"0")).join("");
}
function headers(origin:string|null){
  const h=new Headers({
    "Content-Type":"application/json; charset=utf-8",
    "Cache-Control":"no-store, max-age=0",
    "Pragma":"no-cache","X-Content-Type-Options":"nosniff","Vary":"Origin"
  });
  if(origin&&ALLOWED.has(origin)){
    h.set("Access-Control-Allow-Origin",origin);
    h.set("Access-Control-Allow-Methods","POST,OPTIONS");
    h.set("Access-Control-Allow-Headers","authorization,content-type,apikey");
    h.set("Access-Control-Max-Age","120");
  }
  return h;
}
function reply(value:unknown,status:number,origin:string|null){
  return new Response(JSON.stringify(value),{status,headers:headers(origin)});
}
Deno.serve(async req=>{
  const origin=req.headers.get("origin");
  if(!origin||!ALLOWED.has(origin))return reply({ok:false,error:"forbidden"},403,null);
  if(req.method==="OPTIONS")return new Response(null,{status:204,headers:headers(origin)});
  if(req.method!=="POST")return reply({ok:false,error:"invalid"},405,origin);
  if(!DB||!SERVICE||!ENABLED)return reply({ok:false,error:"setup_required"},503,origin);
  const match=/^Bearer ([0-9a-f]{64})$/.exec(req.headers.get("authorization")||"");
  if(!match)return reply({ok:false,error:"unauthenticated"},401,origin);
  try{
    if(Number(req.headers.get("content-length")||"0")>15000)
      return reply({ok:false,error:"invalid"},413,origin);
    const raw=await req.text();
    if(new TextEncoder().encode(raw).length>15000)
      return reply({ok:false,error:"invalid"},413,origin);
    const body=JSON.parse(raw);
    if(!body||Array.isArray(body)||typeof body!=="object"||!ACTIONS.has(String(body.action||"")))
      return reply({ok:false,error:"invalid_action"},400,origin);
    // The only trusted actor is the UUID returned for this unexpired personal
    // session after checking the staff identity, PIN version and current roles.
    const verification=await fetch(DB+"/rest/v1/rpc/nongkum_r43_personal_pin_auth",{
      method:"POST",headers:{
        "apikey":SERVICE,"Authorization":"Bearer "+SERVICE,
        "Content-Type":"application/json","Accept":"application/json"
      },
      body:JSON.stringify({p_action:"status",p_pin_mac:null,
        p_session_hash:await sha256(match[1]),p_client_key:null,p_global_key:null}),
      signal:AbortSignal.timeout(10000)
    });
    if(!verification.ok){
      console.error("R43 personal identity validation unavailable",verification.status);
      return reply({ok:false,error:"setup_required"},503,origin);
    }
    const account=await verification.json();
    if(!account?.ok||!UUID.test(String(account.staff_id||"")))
      return reply({ok:false,error:"unauthenticated"},401,origin);
    const payload={...body};delete payload.action;
    delete payload.legacy_token;delete payload.token;delete payload.staff_id;
    // Role checks, source locks, verified person IDs and approvals run in
    // the database transaction. Public clients have NO EXECUTE grant.
    const newFixtureAction=String(body.action).startsWith("new_");
    const rpc=await fetch(DB+"/rest/v1/rpc/"+(newFixtureAction?
      "nongkum_r43_new_fixture_gateway":"nongkum_r43_gateway"),{
      method:"POST",
      headers:{
        "apikey":SERVICE,"Authorization":"Bearer "+SERVICE,
        "Content-Type":"application/json","Accept":"application/json"
      },
      body:JSON.stringify({p_uid:account.staff_id,p_action:body.action,p_data:payload}),
      signal:AbortSignal.timeout(10000)
    });
    if(!rpc.ok){
      console.error("R43 RPC rejected status",rpc.status); // no personal data in logs
      return reply({ok:false,error:"unavailable"},503,origin);
    }
    const result=await rpc.json();
    if(!result||typeof result.ok!=="boolean")
      return reply({ok:false,error:"unavailable"},503,origin);
    const status=result.ok?200:
      result.error==="forbidden"||result.error==="forbidden_assignment"||result.error==="invalid_or_forbidden"?403:
      result.error==="source_changed"||result.error==="stale"||
      result.error==="self_review"||result.error==="self_review_or_stale"||
      result.error==="approved_result_lock"||result.error==="already_approved"||
      result.error==="duty_overlap"||result.error==="duty_overlap_within_request"?409:
      result.error==="missing_fixture"||result.error==="missing"?404:400;
    return reply(result,status,origin);
  }catch(_){
    return reply({ok:false,error:"unavailable"},503,origin);
  }
});
