import type { APIRoute } from "astro";

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });
}

export const GET: APIRoute = async ({ locals }) => {
  try {
    // @ts-ignore
    const DB = locals.runtime.env.DB as D1Database;

    const { results } = await DB.prepare(
      \SELECT
          a.id,
          a.role,
          a.created_at,
          p.id as project_id,
          p.name as project_name,
          p.confidentiality as project_confidentiality,
          v.id as vendor_id,
          v.name as vendor_name,
          v.citizenship as vendor_citizenship
       FROM assignments a
       JOIN projects p ON p.id = a.project_id
       JOIN vendors v ON v.id = a.vendor_id
       ORDER BY a.created_at DESC
       LIMIT 200\
    ).all();

    return json({ ok: true, assignments: results ?? [] });
  } catch (err: any) {
    return json({ ok: false, error: err?.message ?? "Unknown error" }, 500);
  }
};
