import type { APIRoute } from "astro";
function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { "content-type":"application/json" } });
}

export const POST: APIRoute = async ({ request, locals }) => {
  try{
    const b = await request.json();
    const id = String(b?.id ?? "").trim();
    if(!id) return json({ ok:false, error:"id is required" }, 400);

    // @ts-ignore
    const DB = locals.runtime.env.DB as D1Database;

    const { results: inv } = await DB.prepare(`SELECT COUNT(1) as c FROM invoices WHERE vendor_id=?`).bind(id).all();
    if(Number(inv?.[0]?.c ?? 0) > 0) return json({ ok:false, error:"Cannot delete vendor with invoices." }, 400);

    const { results: asg } = await DB.prepare(`SELECT COUNT(1) as c FROM assignments WHERE vendor_id=?`).bind(id).all();
    if(Number(asg?.[0]?.c ?? 0) > 0) return json({ ok:false, error:"Cannot delete vendor assigned to a project." }, 400);

    const r = await DB.prepare(`DELETE FROM vendors WHERE id=?`).bind(id).run();
    if((r?.meta?.changes ?? 0) === 0) return json({ ok:false, error:"Vendor not found" }, 404);

    return json({ ok:true });
  } catch(err:any){
    return json({ ok:false, error: err?.message ?? "Unknown error" }, 400);
  }
};
