import type { APIRoute } from "astro";

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json" } });
}

export const GET: APIRoute = async ({ url, locals }) => {
  try {
    const email = (url.searchParams.get("email") || "").trim().toLowerCase();
    if (!email) return json({ ok: false, error: "email is required" }, 400);

    // @ts-ignore
    const DB = locals.runtime.env.DB as D1Database;

    const { results } = await DB.prepare(`
      SELECT id, name, confidentiality, status, supervisor_email,
             submission_url, submission_notes, submitted_at,
             approved_at, approved_by, approval_notes,
             changes_requested_at, changes_requested_by, changes_notes,
             created_at
      FROM projects
      WHERE lower(supervisor_email) = ?
      ORDER BY created_at DESC
      LIMIT 200
    `).bind(email).all();

    return json({ ok: true, projects: results ?? [] });
  } catch (err: any) {
    return json({ ok: false, error: err?.message ?? "Unknown error" }, 500);
  }
};
