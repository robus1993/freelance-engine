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
      \SELECT id, name, confidentiality, supervisor_email, created_at
       FROM projects
       ORDER BY created_at DESC
       LIMIT 200\
    ).all();

    return json({ ok: true, projects: results ?? [] });
  } catch (err: any) {
    return json({ ok: false, error: err?.message ?? "Unknown error" }, 500);
  }
};
