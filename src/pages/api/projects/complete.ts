import type { APIRoute } from "astro";
function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json" } });
}

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const body = await request.json();
    const project_id = String(body?.project_id ?? "").trim();
    const billed_hours = Number(body?.billed_hours ?? NaN);

    if (!project_id) return json({ ok:false, error:"project_id is required" }, 400);
    if (!Number.isFinite(billed_hours) || billed_hours < 0) return json({ ok:false, error:"billed_hours must be >= 0" }, 400);

    // @ts-ignore
    const DB = locals.runtime.env.DB as D1Database;

    const r = await DB.prepare(`
      UPDATE projects
      SET billed_hours=?, status='COMPLETED', completed_at=datetime('now')
      WHERE id=? AND status='IN_PROGRESS'
    `).bind(billed_hours, project_id).run();

    if ((r?.meta?.changes ?? 0) === 0) {
      return json({ ok:false, error:"Project must be IN_PROGRESS to complete." }, 400);
    }

    // invoice + vendor balance are handled by DB trigger
    return json({ ok:true });
  } catch (err:any) {
    return json({ ok:false, error: err?.message ?? "Unknown error" }, 400);
  }
};
