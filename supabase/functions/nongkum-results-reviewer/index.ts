import "jsr:@supabase/functions-js/edge-runtime.d.ts";

// R37 - independent reviewer credential and server-only approval gateway.
// Reviewer PIN is provisioned in a private DB table, never in this source.
const DB = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const ALLOWED_ORIGINS = new Set(["https://infobwd.github.io"]);
const encoder = new TextEncoder();
const MAX_BYTES = 12000;
const hex = (bytes: Uint8Array) => [...bytes].map(n=>n.toString(16).padStart(2,"0")).join("");
async function fingerprint(value: string) {
  return hex(new Uint8Array(await crypto.subtle.digest("SHA-256",encoder.encode(value))));
}
function responseHeaders(origin: string|null) {
  const h = new Headers({
    "Content-Type":"application/json; charset=utf-8",
    "Cache-Control":"no-store, max-age=0",
    "X-Content-Type-Options":"nosniff",
    "Vary":"Origin",
  });
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    h.set("Access-Control-Allow-Origin",origin);
    h.set("Access-Control-Allow-Methods","POST,OPTIONS");
    h.set("Access-Control-Allow-Headers","authorization,content-type,apikey");
    h.set("Access-Control-Max-Age","300");
  }
  return h;
}
function reply(payload: unknown,status: number,origin: string|null) {
  return new Response(JSON.stringify(payload),{status,headers:responseHeaders(origin)});
}
Deno.serve(async req=>{
  const origin=req.headers.get("origin");
  if(!origin||!ALLOWED_ORIGINS.has(origin))return reply({ok:false,error:"forbidden"},403,null);
  if(req.method==="OPTIONS")return new Response(null,{status:204,headers:responseHeaders(origin)});
  if(req.method!=="POST")return reply({ok:false,error:"invalid"},405,origin);
  if(!DB||!SERVICE)return reply({ok:false,error:"unavailable"},503,origin);
  try {
    if(Number(req.headers.get("content-length")||"0")>MAX_BYTES)return reply({ok:false,error:"invalid"},413,origin);
    const raw=await req.text();
    if(encoder.encode(raw).length>MAX_BYTES)return reply({ok:false,error:"invalid"},413,origin);
    const body=JSON.parse(raw);
    if(!body||typeof body!=="object"||Array.isArray(body))return reply({ok:false,error:"invalid"},400,origin);
    const action=String(body.action||"");
    if(!["unlock","status","logout","queue","approve","reject"].includes(action))
      return reply({ok:false,error:"invalid"},400,origin);
    const payload: Record<string,unknown> = {...body};
    delete payload.action;
    if(action==="unlock") {
      const pin=String(payload.pin||"");
      if(!/^\d{8,30}$/.test(pin))return reply({ok:false,error:"invalid"},400,origin);
      const ip=req.headers.get("cf-connecting-ip")||req.headers.get("x-real-ip")||
        req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()||"unknown";
      // Salted one-way rate limiter key; never store user IP or PIN.
      payload.client_key=await fingerprint(SERVICE.slice(-24)+":r37:"+ip);
      payload.token=hex(crypto.getRandomValues(new Uint8Array(32)));
      payload.pin=pin;
    } else {
      const match=/^Bearer ([0-9a-f]{64})$/.exec(req.headers.get("authorization")||"");
      if(!match)return reply({ok:false,error:"expired"},401,origin);
      payload.token=match[1];
    }
    const rpc=await fetch(DB+"/rest/v1/rpc/nongkum_reviewer_gateway",{
      method:"POST",
      headers:{
        "apikey":SERVICE,
        "Authorization":"Bearer "+SERVICE,
        "Content-Type":"application/json",
        "Accept":"application/json",
      },
      body:JSON.stringify({p_action:action,p_data:payload}),
      signal:AbortSignal.timeout(10000),
    });
    if(!rpc.ok){console.error("R37 reviewer RPC status",rpc.status);return reply({ok:false,error:"unavailable"},503,origin);}
    const value=await rpc.json();
    if(!value||typeof value!=="object"||typeof value.ok!=="boolean")
      return reply({ok:false,error:"unavailable"},503,origin);
    const status=value.ok?200:
      value.error==="expired"?401:
      value.error==="wrong_pin"?403:
      value.error==="limited"?429:
      value.error==="stale"||value.error==="missing"||value.error==="source_changed"?409:
      value.error==="setup_required"?503:400;
    return reply(value,status,origin);
  } catch(_) {
    return reply({ok:false,error:"unavailable"},503,origin);
  }
});
