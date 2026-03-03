import type { APIRoute } from "astro";

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json" } });
}

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const body = await request.json();
    const project_id = String(body?.project_id ?? "").trim();
    const submission_url = String(body?.submission_url ?? "").trim();
    const submission_notes = String(body?.submission_notes ?? "").trim();

    if (!project_id) return json({ ok: false, error: "project_id is required" }, 400);
    if (!submission_url) return json({ ok: false, error: "submission_url is required" }, 400);

    // @ts-ignore
    const DB = locals.runtime.env.DB as D1Database;

    await DB.prepare(`
      UPDATE projects
      SET status = 'SUBMITTED',
          submission_url = ?,
          submission_notes = ?,
          submitted_at = datetime('now')
      WHERE id = ?
    `).bind(submission_url, submission_notes || null, project_id).run();

    return json({ ok: true });
  } catch (err: any) {
    return json({ ok: false, error: err?.message ?? "Unknown error" }, 500);
  }
};
