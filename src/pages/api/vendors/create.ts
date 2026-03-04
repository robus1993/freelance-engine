import type { APIRoute } from "astro";

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json" } });
}

const CIT = new Set(["US","GAD","INTERNATIONAL"]);
const DOC = new Set(["PENDING","SIGNED","EXPIRED"]);
const VSTAT = new Set(["ACTIVE","INACTIVE"]);

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const b = await request.json();

    const id = crypto.randomUUID();
    const name = String(b?.name ?? "").trim();
    const email = String(b?.email ?? "").trim() || null;
    const citizenship = String(b?.citizenship ?? "").trim();
    const hourly_rate = Number(b?.hourly_rate ?? 0);
    const nda_status = String(b?.nda_status ?? "PENDING").trim();
    const sa_status = String(b?.sa_status ?? "PENDING").trim();
    const payment_instructions = String(b?.payment_instructions ?? "").trim() || null;
    const status = String(b?.status ?? "ACTIVE").trim();

    if (!name) return json({ ok:false, error:"name is required" }, 400);
    if (!CIT.has(citizenship)) return json({ ok:false, error:"citizenship must be US, GAD, or INTERNATIONAL" }, 400);
    if (!Number.isFinite(hourly_rate) || hourly_rate < 0) return json({ ok:false, error:"hourly_rate must be >= 0" }, 400);
    if (!DOC.has(nda_status)) return json({ ok:false, error:"nda_status invalid" }, 400);
    if (!DOC.has(sa_status)) return json({ ok:false, error:"sa_status invalid" }, 400);
    if (!VSTAT.has(status)) return json({ ok:false, error:"status invalid" }, 400);

    // @ts-ignore
    const DB = locals.runtime.env.DB as D1Database;

    await DB.prepare(`
      INSERT INTO vendors (id, name, email, citizenship, hourly_rate, nda_status, sa_status, payment_instructions, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(id, name, email, citizenship, hourly_rate, nda_status, sa_status, payment_instructions, status).run();

    return json({ ok:true, id });
  } catch (err:any) {
    return json({ ok:false, error: err?.message ?? "Unknown error" }, 500);
  }
};
