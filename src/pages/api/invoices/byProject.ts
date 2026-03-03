import type { APIRoute } from "astro";
function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json" } });
}

export const GET: APIRoute = async ({ url, locals }) => {
  try {
    const project_id = (url.searchParams.get("project_id") || "").trim();
    if (!project_id) return json({ ok:false, error:"project_id is required" }, 400);

    // @ts-ignore
    const DB = locals.runtime.env.DB as D1Database;

    const { results } = await DB.prepare(`
      SELECT
        i.*,
        p.title, p.description, p.attachment_url, p.supervisor_email,
        v.name AS vendor_name, v.email AS vendor_email, v.citizenship AS vendor_citizenship
      FROM invoices i
      JOIN projects p ON p.id = i.project_id
      JOIN vendors v ON v.id = i.vendor_id
      WHERE i.project_id = ?
      LIMIT 1
    `).bind(project_id).all();

    const row = results?.[0] as any;
    if (!row) return json({ ok:false, error:"Invoice not found" }, 404);

    return json({ ok:true, invoice: row });
  } catch (err:any) {
    return json({ ok:false, error: err?.message ?? "Unknown error" }, 500);
  }
};
