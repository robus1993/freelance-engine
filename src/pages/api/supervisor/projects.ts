import type { APIRoute } from "astro";

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });
}

export const GET: APIRoute = async ({ url, locals }) => {
  try {
    const email = (url.searchParams.get("email") || "").trim().toLowerCase();
    if (!email) return json({ ok: false, error: "email is required" }, 400);

    // @ts-ignore
    const DB = locals.runtime.env.DB as D1Database;

    // NOTE: title AS name is for backward compatibility with older UI
    const { results } = await DB.prepare(`
      SELECT
        p.id,
        p.title AS name,
        p.title,
        p.description,
        p.estimated_hours,
        p.hourly_rate_domestic,
        p.hourly_rate_international,
        p.attachment_url,
        p.supervisor_email,
        p.classification,
        p.budget_basis,
        p.approved_estimated_budget,
        p.supervisor_approved,
        p.supervisor_notes,
        p.status,
        p.submitted_at,
        p.approved_at,
        p.started_at,
        p.completed_at,
        p.billed_hours,
        p.created_at,
        a.vendor_id,
        v.name AS vendor_name,
        v.citizenship AS vendor_citizenship
      FROM projects p
      LEFT JOIN assignments a ON a.project_id = p.id
      LEFT JOIN vendors v ON v.id = a.vendor_id
      WHERE lower(p.supervisor_email) = ?
      ORDER BY p.created_at DESC
      LIMIT 200
    `).bind(email).all();

    return json({ ok: true, projects: results ?? [] });
  } catch (err: any) {
    return json({ ok: false, error: err?.message ?? "Unknown error" }, 500);
  }
};
