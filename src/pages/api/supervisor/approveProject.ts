import type { APIRoute } from "astro";
function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json" } });
}

const CLS = new Set(["CONFIDENTIAL","PUBLIC"]);
const BAS = new Set(["DOMESTIC","INTERNATIONAL"]);

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const body = await request.json();
    const project_id = String(body?.project_id ?? "").trim();
    const approved_by = String(body?.approved_by ?? "").trim();
    const classification = String(body?.classification ?? "").trim();
    const budget_basis = String(body?.budget_basis ?? "").trim();
    const notes = String(body?.notes ?? "").trim() || null;
    const override_budget = body?.approved_budget != null ? Number(body.approved_budget) : null;

    if (!project_id) return json({ ok:false, error:"project_id is required" }, 400);
    if (!approved_by) return json({ ok:false, error:"approved_by is required" }, 400);
    if (!CLS.has(classification)) return json({ ok:false, error:"classification must be CONFIDENTIAL or PUBLIC" }, 400);
    if (!BAS.has(budget_basis)) return json({ ok:false, error:"budget_basis must be DOMESTIC or INTERNATIONAL" }, 400);
    if (classification === "CONFIDENTIAL" && budget_basis === "INTERNATIONAL") {
      return json({ ok:false, error:"CONFIDENTIAL projects cannot use INTERNATIONAL budget basis" }, 400);
    }

    // @ts-ignore
    const DB = locals.runtime.env.DB as D1Database;

    const { results } = await DB.prepare(`
      SELECT estimated_hours, hourly_rate_domestic, hourly_rate_international, status
      FROM projects WHERE id=? LIMIT 1
    `).bind(project_id).all();

    const p = results?.[0] as any;
    if (!p) return json({ ok:false, error:"Project not found" }, 404);
    if (p.status !== "SUBMITTED") return json({ ok:false, error:"Project must be SUBMITTED to approve" }, 400);

    const est = Number(p.estimated_hours ?? 0);
    const dom = Number(p.hourly_rate_domestic ?? 0);
    const intl = Number(p.hourly_rate_international ?? 0);
    const computed = est * (budget_basis === "DOMESTIC" ? dom : intl);

    const approved_estimated_budget =
      (override_budget != null && Number.isFinite(override_budget) && override_budget >= 0)
        ? override_budget
        : computed;

    await DB.prepare(`
      UPDATE projects
      SET
        classification=?,
        budget_basis=?,
        approved_estimated_budget=?,
        supervisor_approved=1,
        approved_by=?,
        supervisor_notes=?,
        status='APPROVED',
        approved_at=datetime('now')
      WHERE id=? AND status='SUBMITTED'
    `).bind(classification, budget_basis, approved_estimated_budget, approved_by, notes, project_id).run();

    return json({ ok:true, approved_estimated_budget });
  } catch (err:any) {
    return json({ ok:false, error: err?.message ?? "Unknown error" }, 400);
  }
};
