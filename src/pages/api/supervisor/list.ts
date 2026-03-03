import type { APIRoute } from "astro";
function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json" } });
}

export const GET: APIRoute = async ({ url, locals }) => {
  try {
    const email = (url.searchParams.get("email") || "").trim().toLowerCase();
    if (!email) return json({ ok:false, error:"email is required" }, 400);

    // @ts-ignore
    const DB = locals.runtime.env.DB as D1Database;

    const { results } = await DB.prepare(`
      SELECT
        p.*,
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

    return json({ ok:true, projects: results ?? [] });
  } catch (err:any) {
    return json({ ok:false, error: err?.message ?? "Unknown error" }, 500);
  }
};
