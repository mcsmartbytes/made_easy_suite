import { NextRequest, NextResponse } from 'next/server';
import { getTurso } from '@/lib/turso';
import { estimateToPdfBytes } from '@/lib/estimatePdf';

async function sendViaResend(to: string, subject: string, html: string) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.FROM_EMAIL || 'estimates@localhost';
  if (!apiKey) throw new Error('RESEND_API_KEY not configured');
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to, subject, html })
  });
  if (!res.ok) throw new Error(`Resend error: ${res.status}`);
}

async function sendViaSendgrid(to: string, subject: string, html: string, pdfBase64?: string, pdfName?: string) {
  const apiKey = process.env.SENDGRID_API_KEY;
  const from = process.env.FROM_EMAIL || 'estimates@localhost';
  if (!apiKey) throw new Error('SENDGRID_API_KEY not configured');
  const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: to }] }],
      from: { email: from },
      subject,
      content: [{ type: 'text/html', value: html }],
      attachments: pdfBase64 && pdfName ? [
        { content: pdfBase64, filename: pdfName, type: 'application/pdf', disposition: 'attachment' }
      ] : undefined
    })
  });
  if (!res.ok) throw new Error(`SendGrid error: ${res.status}`);
}

export async function POST(req: NextRequest) {
  try {
    const client = getTurso();
    const { estimate_id, to_email, message } = await req.json();

    if (!estimate_id || !to_email) {
      return NextResponse.json({ success: false, error: 'Missing estimate_id or to_email' }, { status: 400 });
    }

    // Get estimate with job info
    const estResult = await client.execute({
      sql: `
        SELECT e.*, j.name as job_name
        FROM estimates e
        LEFT JOIN jobs j ON e.job_id = j.id
        WHERE e.id = ?
      `,
      args: [estimate_id],
    });

    const est = estResult.rows[0];
    if (!est) {
      return NextResponse.json({ success: false, error: 'Estimate not found' }, { status: 404 });
    }

    // Get estimate items
    const itemsResult = await client.execute({
      sql: `
        SELECT description, quantity as qty, unit_price, is_optional
        FROM estimate_items
        WHERE estimate_id = ?
        ORDER BY sort_order
      `,
      args: [estimate_id],
    });

    const items = itemsResult.rows;

    // Get estimate attachments
    const attsResult = await client.execute({
      sql: `
        SELECT url, filename as kind
        FROM estimate_attachments
        WHERE estimate_id = ?
        ORDER BY created_at DESC
      `,
      args: [estimate_id],
    });

    const atts = attsResult.rows;

    const origin = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const publicUrl = `${origin}/estimates/public/${est.public_token}`;

    // Load branding from user
    let branding: any = {};
    if (est.user_id) {
      const userResult = await client.execute({
        sql: 'SELECT company_name FROM users WHERE id = ?',
        args: [est.user_id],
      });

      if (userResult.rows[0]) {
        branding = {
          business_name: userResult.rows[0].company_name || undefined,
        };
      }
    }

    const jobName = est.job_name as string || 'Job';

    const itemsHtml = items
      .map((i) => `<tr><td>${i.description}</td><td style="text-align:right">${Number(i.qty).toFixed(2)}</td><td style="text-align:right">$${Number(i.unit_price).toFixed(2)}</td><td style="text-align:right">$${(Number(i.qty) * Number(i.unit_price)).toFixed(2)}</td><td style="text-align:right">${i.is_optional ? 'Optional' : ''}</td></tr>`)
      .join('');

    const attsHtml = atts
      .map((a) => `<a href="${a.url}"><img src="${a.url}" alt="Attachment" style="max-width:140px;margin:4px;border-radius:6px;border:1px solid #eee"/></a>`)
      .join('');

    const html = `
      <div style="font-family:system-ui,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#111">
        ${branding.business_name ? `<h1 style=\"margin:0 0 6px;font-size:18px\">${branding.business_name}</h1>` : ''}
        <h2 style="margin:0 0 4px">Estimate for ${jobName}</h2>
        ${est.po_number ? `<p style=\"margin:0 0 8px;color:#555\"><strong>PO Number:</strong> ${est.po_number}</p>` : ''}
        <p style="margin:0 0 12px;color:#555">${message ? String(message) : 'Please review your estimate below.'}</p>
        <table style="width:100%;border-collapse:collapse;border:1px solid #eee">
          <thead>
            <tr style="background:#fafafa"><th style="text-align:left;padding:6px">Description</th><th style="text-align:right;padding:6px">Qty</th><th style="text-align:right;padding:6px">Unit</th><th style="text-align:right;padding:6px">Amount</th><th style="text-align:right;padding:6px">&nbsp;</th></tr>
          </thead>
          <tbody>${itemsHtml}</tbody>
        </table>
        ${attsHtml ? `<div style="margin:12px 0"><strong>Photos:</strong><div>${attsHtml}</div></div>` : ''}
        <div style="margin-top:12px;text-align:right">
          <div>Subtotal: <strong>$${Number(est.subtotal).toFixed(2)}</strong></div>
          <div>Tax: <strong>$${Number(est.tax_amount).toFixed(2)}</strong></div>
          <div>Total: <strong>$${Number(est.total).toFixed(2)}</strong></div>
        </div>
        <p style="margin-top:16px">View and accept online: <a href="${publicUrl}">${publicUrl}</a></p>
      </div>
    `;

    // Build PDF attachment (for SendGrid)
    let pdfBase64: string | undefined;
    const pdfName = `estimate-${est.id}.pdf`;
    try {
      const pdfBytes = estimateToPdfBytes(
        { id: est.id as string, subtotal: Number(est.subtotal), tax: Number(est.tax_amount), total: Number(est.total) },
        items.map((i) => ({ description: i.description as string, qty: Number(i.qty), unit_price: Number(i.unit_price), is_optional: Boolean(i.is_optional) })),
        jobName,
        est.po_number as string || undefined,
        {
          businessName: branding.business_name,
        }
      );
      pdfBase64 = Buffer.from(pdfBytes).toString('base64');
    } catch {}

    const subject = `Estimate for ${jobName}`;
    if (process.env.SENDGRID_API_KEY) {
      await sendViaSendgrid(to_email, subject, html, pdfBase64, pdfName);
    } else {
      await sendViaResend(to_email, subject, html);
    }

    // Update estimate status to sent
    await client.execute({
      sql: `UPDATE estimates SET status = 'sent', sent_at = datetime('now'), updated_at = datetime('now') WHERE id = ?`,
      args: [estimate_id],
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Error sending estimate:', err);
    return NextResponse.json({ success: false, error: err.message || 'Failed to send' }, { status: 500 });
  }
}
