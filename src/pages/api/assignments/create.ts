import type { APIRoute } from "astro";
function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { "content-type":"application/json" } });
}

export const POST: APIRoute = async ({ request, locals }) => {
  try{
    const b = await request.json();
    const project_id = String(b?.project_id ?? "").trim();
    const vendor_id = String(b?.vendor_id ?? "").trim();
    if(!project_id) return json({ ok:false, error:"project_id is required" }, 400);
    if(!vendor_id) return json({ ok:false, error:"vendor_id is required" }, 400);

    // @ts-ignore
    const DB = locals.runtime.env.DB as D1Database;

    const id = crypto.randomUUID();
    await DB.prepare(`INSERT INTO assignments (id, project_id, vendor_id) VALUES (?, ?, ?)`)
      .bind(id, project_id, vendor_id).run();

    return json({ ok:true, id });
  } catch(err:any){
    return json({ ok:false, error: err?.message ?? "Unknown error" }, 400);
  }
};
