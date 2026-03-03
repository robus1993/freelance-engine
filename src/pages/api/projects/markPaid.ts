import type { APIRoute } from "astro";
function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json" } });
}

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const body = await request.json();
    const project_id = String(body?.project_id ?? "").trim();
    const notes = String(body?.notes ?? "").trim() || null;

    if (!project_id) return json({ ok:false, error:"project_id is required" }, 400);

    // @ts-ignore
    const DB = locals.runtime.env.DB as D1Database;

    const { results } = await DB.prepare(`
      SELECT i.id as invoice_id, i.vendor_id, i.amount, i.status as invoice_status
      FROM invoices i
      WHERE i.project_id = ?
      LIMIT 1
    `).bind(project_id).all();

    const inv = results?.[0] as any;
    if (!inv) return json({ ok:false, error:"Invoice not found for project" }, 404);
    if (inv.invoice_status !== "DUE") return json({ ok:false, error:"Invoice is not DUE" }, 400);

    const payment_id = crypto.randomUUID();

    await DB.batch([
      DB.prepare(`UPDATE invoices SET status='PAID', paid_at=datetime('now') WHERE id=?`).bind(inv.invoice_id),
      DB.prepare(`INSERT INTO payments (id, invoice_id, vendor_id, amount, notes) VALUES (?, ?, ?, ?, ?)`)
        .bind(payment_id, inv.invoice_id, inv.vendor_id, inv.amount, notes),
      DB.prepare(`UPDATE vendors SET current_balance = current_balance - ?, historical_earnings = historical_earnings + ? WHERE id=?`)
        .bind(inv.amount, inv.amount, inv.vendor_id),
      DB.prepare(`UPDATE projects SET status='PAID' WHERE id=?`).bind(project_id),
    ]);

    return json({ ok:true, payment_id });
  } catch (err:any) {
    return json({ ok:false, error: err?.message ?? "Unknown error" }, 400);
  }
};
