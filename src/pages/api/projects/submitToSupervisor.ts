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

    const r = await DB.prepare(`
      UPDATE projects
      SET status='SUBMITTED', submitted_at=datetime('now')
      WHERE id=? AND status='DRAFT'
    `).bind(project_id).run();

    if ((r?.meta?.changes ?? 0) === 0) {
      return json({ ok:false, error:"Project must be in DRAFT to submit." }, 400);
    }

    return json({ ok:true });
  } catch (err:any) {
    return json({ ok:false, error: err?.message ?? "Unknown error" }, 500);
  }
};
