import type { APIRoute } from "astro";
function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json" } });
}

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const body = await request.json();
    const project_id = String(body?.project_id ?? "").trim();
    if (!project_id) return json({ ok:false, error:"project_id is required" }, 400);

    // @ts-ignore
    const DB = locals.runtime.env.DB as D1Database;

    const { results } = await DB.prepare(`SELECT status FROM projects WHERE id=?`).bind(project_id).all();
    const p = results?.[0] as any;
    if (!p) return json({ ok:false, error:"Project not found" }, 404);
    if (p.status !== "APPROVED") return json({ ok:false, error:"Project must be APPROVED to start" }, 400);

    const { results: a } = await DB.prepare(`SELECT vendor_id FROM assignments WHERE project_id=?`).bind(project_id).all();
    if (!a?.length) return json({ ok:false, error:"Assign a vendor before starting" }, 400);

    await DB.prepare(`
      UPDATE projects SET status='IN_PROGRESS', started_at=datetime('now')
      WHERE id=? AND status='APPROVED'
    `).bind(project_id).run();

    return json({ ok:true });
  } catch (err:any) {
    return json({ ok:false, error: err?.message ?? "Unknown error" }, 500);
  }
};
