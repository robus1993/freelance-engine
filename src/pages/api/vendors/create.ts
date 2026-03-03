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
    const email = String(body?.email ?? "").trim();
    const citizenship = String(body?.citizenship ?? "").trim(); // US_CITIZEN | NON_US

    if (!name) return json({ error: "name is required" }, 400);
    if (!citizenship) return json({ error: "citizenship is required" }, 400);

    // @ts-ignore - Webflow/WXP provides env on locals.runtime
    const DB = locals.runtime.env.DB as D1Database;

    await DB.prepare(
      `INSERT INTO vendors (id, name, email, citizenship)
       VALUES (?, ?, ?, ?)`
    ).bind(id, name, email || null, citizenship).run();

    return json({ ok: true, id });
  } catch (err: any) {
    return json({ error: err?.message ?? "Unknown error" }, 500);
  }
};