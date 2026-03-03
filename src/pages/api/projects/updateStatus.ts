import type { APIRoute } from "astro";

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json" } });
}

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const body = await request.json();
    const project_id = String(body?.project_id ?? "").trim();
    const status = String(body?.status ?? "").trim();

    if (!project_id) return json({ ok: false, error: "project_id is required" }, 400);
    if (!status) return json({ ok: false, error: "status is required" }, 400);

    // @ts-ignore
    const DB = locals.runtime.env.DB as D1Database;

    await DB.prepare(`UPDATE projects SET status = ? WHERE id = ?`)
      .bind(status, project_id).run();

    return json({ ok: true });
  } catch (err: any) {
    return json({ ok: false, error: err?.message ?? "Unknown error" }, 500);
  }
};
