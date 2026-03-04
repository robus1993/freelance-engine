import type { APIRoute } from "astro";
function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { "content-type":"application/json" } });
}

export const POST: APIRoute = async ({ request, locals }) => {
  try{
    const b = await request.json();
    const id = String(b?.id ?? "").trim();
    if(!id) return json({ ok:false, error:"id is required" }, 400);

    const fields: string[] = [];
    const binds: any[] = [];
    const set = (col: string, val: any) => { fields.push(`${col}=?`); binds.push(val); };

    if (b?.title != null) set("title", String(b.title).trim());
    if (b?.description != null) set("description", String(b.description).trim() || null);

    if (b?.estimated_hours != null) {
      const x = Number(b.estimated_hours);
      if(!Number.isFinite(x) || x < 0) return json({ ok:false, error:"estimated_hours invalid" }, 400);
      set("estimated_hours", x);
    }
    if (b?.hourly_rate_domestic != null) {
      const x = Number(b.hourly_rate_domestic);
      if(!Number.isFinite(x) || x < 0) return json({ ok:false, error:"hourly_rate_domestic invalid" }, 400);
      set("hourly_rate_domestic", x);
    }
    if (b?.hourly_rate_international != null) {
      const x = Number(b.hourly_rate_international);
      if(!Number.isFinite(x) || x < 0) return json({ ok:false, error:"hourly_rate_international invalid" }, 400);
      set("hourly_rate_international", x);
    }

    if (b?.attachment_url != null) set("attachment_url", String(b.attachment_url).trim() || null);
    if (b?.supervisor_email != null) set("supervisor_email", String(b.supervisor_email).trim() || null);

    if(!fields.length) return json({ ok:false, error:"No fields to update" }, 400);

    // only allow edits in DRAFT/NEEDS_INFO/REJECTED
    binds.push(id);
    // @ts-ignore
    const DB = locals.runtime.env.DB as D1Database;

    const r = await DB.prepare(`
      UPDATE projects
      SET ${fields.join(", ")}
      WHERE id = ?
        AND status IN ('DRAFT','NEEDS_INFO','REJECTED')
    `).bind(...binds).run();

    if((r?.meta?.changes ?? 0) === 0) {
      return json({ ok:false, error:"Project not found or not editable in current status." }, 400);
    }

    return json({ ok:true });
  } catch(err:any){
    return json({ ok:false, error: err?.message ?? "Unknown error" }, 400);
  }
};
