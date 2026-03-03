import type { APIRoute } from "astro";

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json" } });
}

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const body = await request.json();
    const project_id = String(body?.project_id ?? "").trim();
    const approved_by = String(body?.approved_by ?? "").trim();
    const approval_notes = String(body?.approval_notes ?? "").trim();

    if (!project_id) return json({ ok: false, error: "project_id is required" }, 400);
    if (!approved_by) return json({ ok: false, error: "approved_by is required" }, 400);

    // @ts-ignore
    const DB = locals.runtime.env.DB as D1Database;

    await DB.prepare(`
      UPDATE projects
      SET status = 'APPROVED',
          approved_at = datetime('now'),
          approved_by = ?,
          approval_notes = ?
      WHERE id = ?
    `).bind(approved_by, approval_notes || null, project_id).run();

    return json({ ok: true });
  } catch (err: any) {
    return json({ ok: false, error: err?.message ?? "Unknown error" }, 500);
  }
};
