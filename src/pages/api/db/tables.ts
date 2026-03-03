export const config = { runtime: "edge" };
import type { APIRoute } from "astro";

export const GET: APIRoute = async ({ locals }) => {
  const env = (locals as any).runtime.env as { DB: D1Database };

  const result = await env.DB
    .prepare("SELECT name, type FROM sqlite_master WHERE type IN ('table','trigger') ORDER BY type, name;")
    .all();

  return new Response(JSON.stringify({ ok: true, items: result.results }), {
    headers: { "content-type": "application/json" }
  });
};