import type { APIRoute } from "astro";

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json" } });
}

const STATUSES = new Set(["DRAFT","SUBMITTED","APPROVED","IN_PROGRESS","COMPLETED","PAID"]);

export const GET: APIRoute = async ({ url, locals }) => {
  try {
    const statusParam = (url.searchParams.get("status") || "").trim();
    const supervisor_email = (url.searchParams.get("supervisor_email") || "").trim().toLowerCase();

    // @ts-ignore
    const DB = locals.runtime.env.DB as D1Database;

    let where = "WHERE 1=1";
    const binds: any[] = [];

    if (supervisor_email) {
      where += " AND lower(p.supervisor_email) = ?";
      binds.push(supervisor_email);
    }

    if (statusParam) {
      const parts = statusParam.split(",").map(s => s.trim()).filter(Boolean);
      const ok = parts.filter(s => STATUSES.has(s));
      if (ok.length) {
        where += ` AND p.status IN (${ok.map(() => "?").join(",")})`;
        binds.push(...ok);
      }
    }

    const stmt = DB.prepare(`
      SELECT
        p.*,
        a.vendor_id,
        v.name AS vendor_name,
        v.citizenship AS vendor_citizenship,
        i.status AS invoice_status,
        i.amount AS invoice_amount
      FROM projects p
      LEFT JOIN assignments a ON a.project_id = p.id
      LEFT JOIN vendors v ON v.id = a.vendor_id
      LEFT JOIN invoices i ON i.project_id = p.id
      ${where}
      ORDER BY p.created_at DESC
      LIMIT 200
    `).bind(...binds);

    const { results } = await stmt.all();
    return json({ ok:true, projects: results ?? [] });
  } catch (err: any) {
    return json({ ok:false, error: err?.message ?? "Unknown error" }, 500);
  }
};
