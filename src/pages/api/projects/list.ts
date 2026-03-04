import type { APIRoute } from "astro";
function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { "content-type":"application/json" } });
}

export const GET: APIRoute = async ({ url, locals }) => {
  try{
    const statusParam = (url.searchParams.get("status") || "").trim();

    // @ts-ignore
    const DB = locals.runtime.env.DB as D1Database;

    let where = "WHERE 1=1";
    const binds: any[] = [];

    if(statusParam){
      const parts = statusParam.split(",").map(s => s.trim()).filter(Boolean);
      if(parts.length){
        where += ` AND p.status IN (${parts.map(()=>"?").join(",")})`;
        binds.push(...parts);
      }
    }

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
      ${where}
      ORDER BY p.created_at DESC
      LIMIT 300
    `).bind(...binds).all();

    return json({ ok:true, projects: results ?? [] });
  } catch(err:any){
    return json({ ok:false, error: err?.message ?? "Unknown error" }, 500);
  }
};
