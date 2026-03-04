import type { APIRoute } from "astro";
function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { "content-type":"application/json" } });
}
const CIT = new Set(["US","GAD","INTERNATIONAL"]);
const DOC = new Set(["PENDING","SIGNED","EXPIRED"]);
const VSTAT = new Set(["ACTIVE","INACTIVE"]);

export const POST: APIRoute = async ({ request, locals }) => {
  try{
    const b = await request.json();
    const id = String(b?.id ?? "").trim();
    if(!id) return json({ ok:false, error:"id is required" }, 400);

    const fields: string[] = [];
    const binds: any[] = [];

    const setText = (col: string, val: any) => { fields.push(`${col}=?`); binds.push(val); };

    if (b?.name != null) setText("name", String(b.name).trim());
    if (b?.email != null) setText("email", String(b.email).trim() || null);

    if (b?.citizenship != null) {
      const c = String(b.citizenship).trim();
      if(!CIT.has(c)) return json({ ok:false, error:"citizenship invalid" }, 400);
      setText("citizenship", c);
    }
    if (b?.hourly_rate != null) {
      const r = Number(b.hourly_rate);
      if(!Number.isFinite(r) || r < 0) return json({ ok:false, error:"hourly_rate invalid" }, 400);
      setText("hourly_rate", r);
    }
    if (b?.nda_status != null) {
      const s = String(b.nda_status).trim();
      if(!DOC.has(s)) return json({ ok:false, error:"nda_status invalid" }, 400);
      setText("nda_status", s);
    }
    if (b?.sa_status != null) {
      const s = String(b.sa_status).trim();
      if(!DOC.has(s)) return json({ ok:false, error:"sa_status invalid" }, 400);
      setText("sa_status", s);
    }
    if (b?.payment_instructions != null) setText("payment_instructions", String(b.payment_instructions).trim() || null);

    if (b?.status != null) {
      const s = String(b.status).trim();
      if(!VSTAT.has(s)) return json({ ok:false, error:"status invalid" }, 400);
      setText("status", s);
    }

    if(!fields.length) return json({ ok:false, error:"No fields to update" }, 400);

    // @ts-ignore
    const DB = locals.runtime.env.DB as D1Database;

    binds.push(id);
    const r = await DB.prepare(`UPDATE vendors SET ${fields.join(", ")} WHERE id=?`).bind(...binds).run();
    if((r?.meta?.changes ?? 0) === 0) return json({ ok:false, error:"Vendor not found" }, 404);

    return json({ ok:true });
  } catch(err:any){
    return json({ ok:false, error: err?.message ?? "Unknown error" }, 400);
  }
};
