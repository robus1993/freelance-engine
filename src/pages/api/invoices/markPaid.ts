import type { APIRoute } from "astro";
function json(data: unknown, status=200) {
  return new Response(JSON.stringify(data), { status, headers: { "content-type":"application/json" } });
}

export const POST: APIRoute = async ({ request, locals }) => {
  try{
    const b = await request.json();
    const invoice_id = String(b?.invoice_id ?? "").trim();
    const method = String(b?.method ?? "").trim() || null;
    const notes = String(b?.notes ?? "").trim() || null;

    if(!invoice_id) return json({ ok:false, error:"invoice_id is required" }, 400);

    // @ts-ignore
    const DB = locals.runtime.env.DB as D1Database;

    const { results } = await DB.prepare(`
      SELECT id, vendor_id, amount, status
      FROM invoices WHERE id=? LIMIT 1
    `).bind(invoice_id).all();

    const inv = results?.[0] as any;
    if(!inv) return json({ ok:false, error:"Invoice not found" }, 404);
    if(inv.status !== "DUE") return json({ ok:false, error:"Invoice is not DUE" }, 400);

    const payment_id = crypto.randomUUID();

    await DB.batch([
      DB.prepare(`UPDATE invoices SET status='PAID', paid_at=datetime('now') WHERE id=?`).bind(invoice_id),
      DB.prepare(`INSERT INTO payments (id, invoice_id, vendor_id, amount, method, notes) VALUES (?, ?, ?, ?, ?, ?)`)
        .bind(payment_id, invoice_id, inv.vendor_id, inv.amount, method, notes),
    ]);

    // vendor + project updates happen via DB trigger on invoice status change
    return json({ ok:true, payment_id });
  } catch(err:any){
    return json({ ok:false, error: err?.message ?? "Unknown error" }, 400);
  }
};
