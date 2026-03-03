import type { APIRoute } from "astro";

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });
}

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const body = await request.json();

    const id = crypto.randomUUID();
    const project_id = String(body?.project_id ?? "").trim();
    const vendor_id = String(body?.vendor_id ?? "").trim();
    const role = String(body?.role ?? "").trim();

    if (!project_id) return json({ error: "project_id is required" }, 400);
    if (!vendor_id) return json({ error: "vendor_id is required" }, 400);

    // @ts-ignore
    const DB = locals.runtime.env.DB as D1Database;

    // This INSERT will trigger your DB rule for CONFIDENTIAL projects.
    await DB.prepare(
      `INSERT INTO assignments (id, project_id, vendor_id, role)
       VALUES (?, ?, ?, ?)`
    ).bind(id, project_id, vendor_id, role || null).run();

    return json({ ok: true, id });
  } catch (err: any) {
    // If the trigger blocks it, you'll see the exact abort message here.
    return json({ error: err?.message ?? "Unknown error" }, 400);
  }
};