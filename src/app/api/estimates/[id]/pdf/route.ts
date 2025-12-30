import { NextRequest } from 'next/server';
import { getTurso } from '@/lib/turso';
import { estimateToPdfBytes } from '@/lib/estimatePdf';

export async function GET(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const client = getTurso();
    const { id } = await context.params;

    // Get estimate with job info
    const estResult = await client.execute({
      sql: `
        SELECT e.*, j.name as job_name
        FROM estimates e
        LEFT JOIN jobs j ON e.job_id = j.id
        WHERE e.id = ?
      `,
      args: [id],
    });

    const est = estResult.rows[0];
    if (!est) {
      return new Response(JSON.stringify({ error: 'Estimate not found' }), { status: 404 });
    }

    // Get estimate items
    const itemsResult = await client.execute({
      sql: `
        SELECT description, quantity as qty, unit_price, is_optional
        FROM estimate_items
        WHERE estimate_id = ?
        ORDER BY sort_order
      `,
      args: [id],
    });

    const items = itemsResult.rows;

    // Load branding from user profile (if we have a users table with branding)
    let branding: { businessName?: string; companyEmail?: string; companyPhone?: string; companyAddress?: string; companyWebsite?: string } | undefined;

    if (est.user_id) {
      const userResult = await client.execute({
        sql: 'SELECT company_name FROM users WHERE id = ?',
        args: [est.user_id],
      });

      if (userResult.rows[0]) {
        branding = {
          businessName: userResult.rows[0].company_name as string || undefined,
        };
      }
    }

    const jobName = est.job_name as string || undefined;

    const pdf = estimateToPdfBytes(
      {
        id: est.id as string,
        created_at: est.created_at as string,
        subtotal: Number(est.subtotal),
        tax: Number(est.tax_amount),
        total: Number(est.total),
      },
      items.map((i) => ({
        description: i.description as string,
        qty: Number(i.qty),
        unit_price: Number(i.unit_price),
        is_optional: Boolean(i.is_optional),
      })),
      jobName,
      est.po_number as string || undefined,
      branding
    ) as Uint8Array<ArrayBuffer>;

    const pdfBlob = new Blob([pdf], { type: 'application/pdf' });

    return new Response(pdfBlob, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="estimate-${id}.pdf"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (err: any) {
    console.error('Error generating PDF:', err);
    return new Response(JSON.stringify({ error: err?.message || 'Failed to generate PDF' }), { status: 500 });
  }
}
