import "jsr:@supabase/functions-js/edge-runtime.d.ts";

// Nongkum R34: six-hour submit-only unlock; approval remains a separate human operation.
const DB = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const ALLOWED_ORIGINS = new Set(["https://infobwd.github.io"]);
const limitBytes = 12000;
const encoder = new TextEncoder();
const hex = (buf: Uint8Array) => [...buf].map((n) => n.toString(16).padStart(2, "0")).join("");
async function fingerprint(input: string) {
  const hash = await crypto.subtle.digest("SHA-256", encoder.encode(input));
  return hex(new Uint8Array(hash));
}
function headers(origin: string | null) {
  const h = new Headers({
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store, max-age=0",
    "X-Content-Type-Options": "nosniff",
    "Vary": "Origin",
  });
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    h.set("Access-Control-Allow-Origin", origin);
    h.set("Access-Control-Allow-Methods", "POST,OPTIONS");
    h.set("Access-Control-Allow-Headers", "authorization,content-type,apikey");
    h.set("Access-Control-Max-Age", "300");
  }
  return h;
}
function respond(payload: unknown, status: number, origin: string | null) {
  return new Response(JSON.stringify(payload), { status, headers: headers(origin) });
}

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");
  if (!origin || !ALLOWED_ORIGINS.has(origin)) return respond({ ok:false, error:"forbidden" },403,null);
  if (req.method === "OPTIONS") return new Response(null,{status:204,headers:headers(origin)});
  if (req.method !== "POST") return respond({ok:false,error:"method"},405,origin);
  if (!DB || !SERVICE) return respond({ok:false,error:"unavailable"},503,origin);
  try {
    if (Number(req.headers.get("content-length")||"0") > limitBytes) {
      return respond({ok:false,error:"invalid"},413,origin);
    }
    const raw = await req.text();
    if (raw.length > limitBytes) return respond({ok:false,error:"invalid"},413,origin);
    const body = JSON.parse(raw);
    if (!body || typeof body!=="object" || Array.isArray(body)) {
      return respond({ok:false,error:"invalid"},400,origin);
    }
    const action = String(body.action||"");
    if (!["unlock","status","logout","fixture","submit"].includes(action)) {
      return respond({ok:false,error:"invalid"},400,origin);
    }
    const p: Record<string, unknown> = { ...body };
    delete p.action;
    if (action==="unlock") {
      const pin=String(p.pin||"");
      if (!/^\d{4,30}$/.test(pin)) return respond({ok:false,error:"invalid"},400,origin);
      p.pin=pin;
      // The IP is used only in a salted, nonreversible rate-limit fingerprint.
      const ip = req.headers.get("cf-connecting-ip")
        || req.headers.get("x-real-ip")
        || req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
      p.client_key = await fingerprint(SERVICE.slice(-24)+":"+ip);
      p.token = hex(crypto.getRandomValues(new Uint8Array(32)));
    } else {
      const auth = req.headers.get("authorization")||"";
      const m = /^Bearer ([a-f0-9]{64})$/.exec(auth);
      if (!m) return respond({ok:false,error:"expired"},401,origin);
      p.token=m[1];
    }
    const resp = await fetch(DB+"/rest/v1/rpc/nongkum_editor_gateway",{
      method:"POST",
      headers:{
        apikey:SERVICE,
        Authorization:"Bearer "+SERVICE,
        "Content-Type":"application/json",
        Accept:"application/json",
      },
      body:JSON.stringify({p_action:action,p_data:p}),
      signal:AbortSignal.timeout(10000),
    });
    if(!resp.ok) {
      console.error("Nongkum editor RPC failed",resp.status);
      return respond({ok:false,error:"unavailable"},503,origin);
    }
    const answer=await resp.json();
    if (!answer || typeof answer!=="object" || typeof answer.ok!=="boolean") {
      return respond({ok:false,error:"unavailable"},503,origin);
    }
    const code=answer.ok?200:
      answer.error==="expired"?401:
      answer.error==="limited"?429:
      answer.error==="pending"||answer.error==="stale"?409:
      answer.error==="wrong_pin"?403:400;
    return respond(answer,code,origin);
  } catch (_err) {
    return respond({ok:false,error:"unavailable"},503,origin);
  }
});