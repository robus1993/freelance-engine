import type { APIRoute } from "astro";

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json" } });
}

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const body = await request.json();

    const id = crypto.randomUUID();
    const title = String(body?.title ?? "").trim();
    const description = String(body?.description ?? "").trim() || null;

    const estimated_hours = Number(body?.estimated_hours ?? 0);
    const hourly_rate_domestic = Number(body?.hourly_rate_domestic ?? 0);
    const hourly_rate_international = Number(body?.hourly_rate_international ?? 0);

    const attachment_url = String(body?.attachment_url ?? "").trim() || null;
    const supervisor_email = String(body?.supervisor_email ?? "").trim() || null;

    if (!title) return json({ ok:false, error:"title is required" }, 400);
    if (!Number.isFinite(estimated_hours) || estimated_hours < 0) return json({ ok:false, error:"estimated_hours must be >= 0" }, 400);
    if (!Number.isFinite(hourly_rate_domestic) || hourly_rate_domestic < 0) return json({ ok:false, error:"hourly_rate_domestic must be >= 0" }, 400);
    if (!Number.isFinite(hourly_rate_international) || hourly_rate_international < 0) return json({ ok:false, error:"hourly_rate_international must be >= 0" }, 400);

    // @ts-ignore
    const DB = locals.runtime.env.DB as D1Database;

    await DB.prepare(`
      INSERT INTO projects (
        id, title, description,
        estimated_hours, hourly_rate_domestic, hourly_rate_international,
        attachment_url, supervisor_email
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id, title, description,
      estimated_hours, hourly_rate_domestic, hourly_rate_international,
      attachment_url, supervisor_email
    ).run();

    return json({ ok:true, id });
  } catch (err: any) {
    return json({ ok:false, error: err?.message ?? "Unknown error" }, 500);
  }
};
