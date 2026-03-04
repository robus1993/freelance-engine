import type { APIRoute } from "astro";
function json(data: unknown, status=200) {
  return new Response(JSON.stringify(data), { status, headers: { "content-type":"application/json" } });
}
const CLS = new Set(["CONFIDENTIAL","PUBLIC"]);

export const POST: APIRoute = async ({ request, locals }) => {
  try{
    const b = await request.json();
    const project_id = String(b?.project_id ?? "").trim();
    const reviewed_by = String(b?.reviewed_by ?? "").trim();
    const classification = String(b?.classification ?? "").trim();
    const supervisor_notes = String(b?.supervisor_notes ?? "").trim() || null;

    if(!project_id) return json({ ok:false, error:"project_id is required" }, 400);
    if(!reviewed_by) return json({ ok:false, error:"reviewed_by is required" }, 400);
    if(!CLS.has(classification)) return json({ ok:false, error:"classification must be CONFIDENTIAL or PUBLIC" }, 400);

    // @ts-ignore
    const DB = locals.runtime.env.DB as D1Database;

    const { results } = await DB.prepare(`
      SELECT status, estimated_hours, hourly_rate_domestic, hourly_rate_international
      FROM projects WHERE id=? LIMIT 1
    `).bind(project_id).all();

    const p = results?.[0] as any;
    if(!p) return json({ ok:false, error:"Project not found" }, 404);
    if(p.status !== "SUBMITTED") return json({ ok:false, error:"Project must be SUBMITTED to approve" }, 400);

    const est = Number(p.estimated_hours ?? 0);
    const dom = Number(p.hourly_rate_domestic ?? 0);
    const intl = Number(p.hourly_rate_international ?? 0);
    const approved_estimated_budget = est * (classification === "CONFIDENTIAL" ? dom : intl);

    await DB.prepare(`
      UPDATE projects
      SET
        classification=?,
        approved_estimated_budget=?,
        supervisor_notes=?,
        reviewed_by=?,
        reviewed_at=datetime('now'),
        status='PENDING_START'
      WHERE id=? AND status='SUBMITTED'
    `).bind(classification, approved_estimated_budget, supervisor_notes, reviewed_by, project_id).run();

    return json({ ok:true, approved_estimated_budget });
  } catch(err:any){
    return json({ ok:false, error: err?.message ?? "Unknown error" }, 400);
  }
};
