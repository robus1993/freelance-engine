import type { APIRoute } from "astro";

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json" } });
}

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const body = await request.json();
    const project_id = String(body?.project_id ?? "").trim();
    const requested_by = String(body?.requested_by ?? "").trim();
    const changes_notes = String(body?.changes_notes ?? "").trim();

    if (!project_id) return json({ ok: false, error: "project_id is required" }, 400);
    if (!requested_by) return json({ ok: false, error: "requested_by is required" }, 400);
    if (!changes_notes) return json({ ok: false, error: "changes_notes is required" }, 400);

    // @ts-ignore
    const DB = locals.runtime.env.DB as D1Database;

    await DB.prepare(`
      UPDATE projects
      SET status = 'CHANGES_REQUESTED',
          changes_requested_at = datetime('now'),
          changes_requested_by = ?,
          changes_notes = ?
      WHERE id = ?
    `).bind(requested_by, changes_notes, project_id).run();

    return json({ ok: true });
  } catch (err: any) {
    return json({ ok: false, error: err?.message ?? "Unknown error" }, 500);
  }
};
