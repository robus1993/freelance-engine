import type { APIRoute } from "astro";
function json(data: unknown, status=200) {
  return new Response(JSON.stringify(data), { status, headers: { "content-type":"application/json" } });
}

export const GET: APIRoute = async ({ url, locals }) => {
  try{
    const email = (url.searchParams.get("email") || "").trim().toLowerCase();
    if(!email) return json({ ok:false, error:"email is required" }, 400);

    // @ts-ignore
    const DB = locals.runtime.env.DB as D1Database;

    const { results } = await DB.prepare(`
      SELECT
        p.*,
        a.vendor_id,
        v.name AS vendor_name,
        v.citizenship AS vendor_citizenship,
        i.status AS invoice_status,
        i.amount AS invoice_amount,
        i.invoice_number AS invoice_number
      FROM projects p
      LEFT JOIN assignments a ON a.project_id = p.id
      LEFT JOIN vendors v ON v.id = a.vendor_id
      LEFT JOIN invoices i ON i.project_id = p.id
      WHERE lower(p.supervisor_email) = ?
      ORDER BY p.created_at DESC
      LIMIT 300
    `).bind(email).all();

    return json({ ok:true, projects: results ?? [] });
  } catch(err:any){
    return json({ ok:false, error: err?.message ?? "Unknown error" }, 500);
  }
};
