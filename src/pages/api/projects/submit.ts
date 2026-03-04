import type { APIRoute } from "astro";
function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { "content-type":"application/json" } });
}

export const POST: APIRoute = async ({ request, locals }) => {
  try{
    const b = await request.json();
    const id = String(b?.project_id ?? "").trim();
    if(!id) return json({ ok:false, error:"project_id is required" }, 400);

    // @ts-ignore
    const DB = locals.runtime.env.DB as D1Database;

    const r = await DB.prepare(`
      UPDATE projects
      SET status='SUBMITTED', submitted_at=datetime('now')
      WHERE id=?
        AND status IN ('DRAFT','NEEDS_INFO','REJECTED')
    `).bind(id).run();

    if((r?.meta?.changes ?? 0) === 0) return json({ ok:false, error:"Project not found or not submittable." }, 400);

    return json({ ok:true });
  } catch(err:any){
    return json({ ok:false, error: err?.message ?? "Unknown error" }, 400);
  }
};
