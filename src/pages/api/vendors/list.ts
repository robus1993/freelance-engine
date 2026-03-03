import type { APIRoute } from "astro";

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json" } });
}

export const GET: APIRoute = async ({ locals }) => {
  try {
    // @ts-ignore
    const DB = locals.runtime.env.DB as D1Database;

    const { results } = await DB.prepare(`
      SELECT
        v.id, v.name, v.email, v.citizenship, v.hourly_rate,
        v.nda_status, v.sa_status,
        v.current_balance, v.historical_earnings,
        v.status, v.created_at,
        COALESCE(COUNT(p.id), 0) AS past_projects
      FROM vendors v
      LEFT JOIN assignments a ON a.vendor_id = v.id
      LEFT JOIN projects p ON p.id = a.project_id
      GROUP BY v.id
      ORDER BY v.created_at DESC
      LIMIT 200
    `).all();

    return json({ ok:true, vendors: results ?? [] });
  } catch (err: any) {
    return json({ ok:false, error: err?.message ?? "Unknown error" }, 500);
  }
};
