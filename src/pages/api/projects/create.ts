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
    const name = String(body?.name ?? "").trim();
    const confidentiality = String(body?.confidentiality ?? "STANDARD").trim(); // STANDARD | CONFIDENTIAL
    const supervisor_email = String(body?.supervisor_email ?? "").trim();

    if (!name) return json({ error: "name is required" }, 400);

    // @ts-ignore
    const DB = locals.runtime.env.DB as D1Database;

    await DB.prepare(
      `INSERT INTO projects (id, name, confidentiality, supervisor_email)
       VALUES (?, ?, ?, ?)`
    ).bind(id, name, confidentiality, supervisor_email || null).run();

    return json({ ok: true, id });
  } catch (err: any) {
    return json({ error: err?.message ?? "Unknown error" }, 500);
  }
};