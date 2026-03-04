import type { APIRoute } from "astro";
function json(data: unknown, status=200) {
  return new Response(JSON.stringify(data), { status, headers: { "content-type":"application/json" } });
}

export const POST: APIRoute = async ({ request, locals }) => {
  try{
    const b = await request.json();
    const project_id = String(b?.project_id ?? "").trim();
    const reviewed_by = String(b?.reviewed_by ?? "").trim();
    const supervisor_notes = String(b?.supervisor_notes ?? "").trim();

    if(!project_id) return json({ ok:false, error:"project_id is required" }, 400);
    if(!reviewed_by) return json({ ok:false, error:"reviewed_by is required" }, 400);
    if(!supervisor_notes) return json({ ok:false, error:"request notes required" }, 400);

    // @ts-ignore
    const DB = locals.runtime.env.DB as D1Database;

    const r = await DB.prepare(`
      UPDATE projects
      SET
        supervisor_notes=?,
        reviewed_by=?,
        reviewed_at=datetime('now'),
        status='NEEDS_INFO'
      WHERE id=? AND status='SUBMITTED'
    `).bind(supervisor_notes, reviewed_by, project_id).run();

    if((r?.meta?.changes ?? 0) === 0) return json({ ok:false, error:"Project must be SUBMITTED to request info." }, 400);

    return json({ ok:true });
  } catch(err:any){
    return json({ ok:false, error: err?.message ?? "Unknown error" }, 400);
  }
};
