import "jsr:@supabase/functions-js/edge-runtime.d.ts";
// R43-F STAGING: personal PIN identity ONLY. No schedule writes or approvals.
// Never deploy until migration, secure issuance, secret and mobile QA are complete.
// If deployed by mistake the endpoint stays disabled without explicit env gate.
const DB=Deno.env.get("SUPABASE_URL")??"";
const SERVICE=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")??"";
const PEPPER=Deno.env.get("R43_PIN_PEPPER")??"";
const ENABLED=Deno.env.get("R43_PERSONAL_PIN_ENABLED")==="true";
const ORIGIN="https://infobwd.github.io";
const MAC=/^[0-9a-f]{64}$/;
const PIN=/^[0-9]{10,16}$/;
const enc=new TextEncoder();
const hex=(value:Uint8Array)=>Array.from(value,b=>b.toString(16).padStart(2,"0")).join("");
const hash=async(value:string)=>hex(new Uint8Array(await crypto.subtle.digest("SHA-256",enc.encode(value))));
const keyPromise=PEPPER.length>=32?
  crypto.subtle.importKey("raw",enc.encode(PEPPER),{name:"HMAC",hash:"SHA-256"},false,["sign"]):null;
async function hmac(value:string){
  const k=await keyPromise;
  if(!k)throw Error("not_configured");
  return hex(new Uint8Array(await crypto.subtle.sign("HMAC",k,enc.encode(value))));
}
function cors(origin:string|null){
  const h=new Headers({"Content-Type":"application/json; charset=utf-8",
    "Cache-Control":"no-store, max-age=0","Pragma":"no-cache",
    "X-Content-Type-Options":"nosniff","Vary":"Origin"});
  if(origin===ORIGIN){
    h.set("Access-Control-Allow-Origin",origin);
    h.set("Access-Control-Allow-Methods","POST,OPTIONS");
    h.set("Access-Control-Allow-Headers","content-type,apikey");
    h.set("Access-Control-Max-Age","120");
  }
  return h;
}
function respond(body:unknown,status:number,origin:string|null){
  return new Response(JSON.stringify(body),{status,headers:cors(origin)});
}
async function rpc(params:Record<string,string|null>){
  const res=await fetch(DB+"/rest/v1/rpc/nongkum_r43_personal_pin_auth",{
    method:"POST",headers:{"apikey":SERVICE,"Authorization":"Bearer "+SERVICE,
      "Content-Type":"application/json","Accept":"application/json"},
    body:JSON.stringify(params),signal:AbortSignal.timeout(8000)
  });
  if(!res.ok)throw Error("rpc_unavailable");
  return await res.json();
}
Deno.serve(async(req)=>{
  const origin=req.headers.get("origin");
  if(origin!==ORIGIN)return respond({ok:false,error:"forbidden"},403,null);
  if(req.method==="OPTIONS")return new Response(null,{status:204,headers:cors(origin)});
  if(req.method!=="POST")return respond({ok:false,error:"invalid"},405,origin);
  if(!ENABLED||!DB||!SERVICE||!keyPromise)
    return respond({ok:false,error:"setup_required"},503,origin);
  try{
    if(Number(req.headers.get("content-length")||"0")>2048)
      return respond({ok:false,error:"invalid"},413,origin);
    const raw=await req.text();
    if(enc.encode(raw).length>2048)return respond({ok:false,error:"invalid"},413,origin);
    const body=JSON.parse(raw);
    if(!body||typeof body!=="object"||Array.isArray(body)||
       !["login","status","logout"].includes(body.action))
      return respond({ok:false,error:"invalid"},400,origin);
    const action=body.action as string;
    const token=action==="login"?
      hex(crypto.getRandomValues(new Uint8Array(32))):String(body.token||"");
    if(!MAC.test(token))return respond({ok:false,error:"unauthenticated"},401,origin);
    // Token is random 256-bit; DB stores its SHA-256 only. Raw PIN never stored.
    const tokenHash=await hash(token);
    const pin=typeof body.pin==="string"?body.pin:"";
    // Invalid-format PINs are counted too, with a never-issued lookup MAC.
    const pinMac=action==="login"?await hmac(PIN.test(pin)?"pin:"+pin:"invalid:"+pin.slice(0,32)):null;
    // Limit source-identification is defense-in-depth; the DB ALSO applies a
    // global atomic limiter so spoofed / missing IP headers cannot bypass it.
    const forwarded=(req.headers.get("x-forwarded-for")||"").split(",").at(-1)?.trim()||"";
    const ip=req.headers.get("cf-connecting-ip")||forwarded||"unattributed";
    const clientKey=action==="login"?await hmac("client:"+ip.slice(0,100)):null;
    const globalKey=action==="login"?await hmac("global"):null;
    const result=await rpc({p_action:action,p_pin_mac:pinMac,
      p_session_hash:tokenHash,p_client_key:clientKey,p_global_key:globalKey});
    if(!result||result.ok!==true){
      const status=result?.error==="limited"?429:result?.error==="invalid"?400:401;
      return respond({ok:false,error:status===429?"limited":"unauthenticated"},status,origin);
    }
    if(action==="login"){
      // Never return role/session metadata before verifying the PIN.
      return respond({...result,token},200,origin);
    }
    return respond(result,200,origin);
  }catch(_){
    // No credentials, tokens, personal data, or raw request bodies in logs.
    return respond({ok:false,error:"unavailable"},503,origin);
  }
});
