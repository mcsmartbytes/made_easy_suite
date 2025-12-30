import { NextRequest, NextResponse } from 'next/server';
import { getTurso } from '@/lib/turso';

// GET - fetch a single estimate by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Estimate ID is required' },
        { status: 400 }
      );
    }

    const client = getTurso();

    const result = await client.execute({
      sql: `
        SELECT e.*, j.name as job_name, c.first_name, c.last_name, c.email as contact_email
        FROM estimates e
        LEFT JOIN jobs j ON e.job_id = j.id
        LEFT JOIN contacts c ON e.contact_id = c.id
        WHERE e.id = ?
      `,
      args: [id],
    });

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Estimate not found' },
        { status: 404 }
      );
    }

    const row = result.rows[0];
    const estimate = {
      id: row.id,
      user_id: row.user_id,
      job_id: row.job_id,
      contact_id: row.contact_id,
      status: row.status,
      title: row.title,
      client_name: row.client_name,
      client_email: row.client_email,
      client_phone: row.client_phone,
      client_address: row.client_address,
      project_address: row.project_address,
      estimate_date: row.estimate_date,
      valid_until: row.valid_until,
      po_number: row.po_number,
      payment_terms: row.payment_terms,
      scope_of_work: row.scope_of_work,
      notes: row.notes,
      terms_and_conditions: row.terms_and_conditions,
      subtotal: Number(row.subtotal || 0),
      discount_type: row.discount_type,
      discount_value: Number(row.discount_value || 0),
      discount_amount: Number(row.discount_amount || 0),
      tax_rate: Number(row.tax_rate || 0),
      tax_amount: Number(row.tax_amount || 0),
      total: Number(row.total || 0),
      public_token: row.public_token,
      sent_at: row.sent_at,
      viewed_at: row.viewed_at,
      accepted_at: row.accepted_at,
      created_at: row.created_at,
      updated_at: row.updated_at,
      job_name: row.job_name,
      contact: row.first_name ? {
        first_name: row.first_name,
        last_name: row.last_name,
        email: row.contact_email,
      } : null,
    };

    return NextResponse.json({ success: true, data: estimate });
  } catch (error: any) {
    console.error('Error fetching estimate:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// PUT - update an estimate
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Estimate ID is required' },
        { status: 400 }
      );
    }

    const client = getTurso();

    const allowedFields = [
      'job_id', 'contact_id', 'status', 'title',
      'client_name', 'client_email', 'client_phone', 'client_address',
      'project_address', 'estimate_date', 'valid_until', 'po_number',
      'payment_terms', 'scope_of_work', 'notes', 'terms_and_conditions',
      'subtotal', 'discount_type', 'discount_value', 'discount_amount',
      'tax_rate', 'tax_amount', 'total',
    ];

    const fields: string[] = [];
    const values: (string | number | null)[] = [];

    for (const [key, value] of Object.entries(body)) {
      if (allowedFields.includes(key)) {
        fields.push(`${key} = ?`);
        values.push(value as string | number | null);
      }
    }

    if (fields.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No valid fields to update' },
        { status: 400 }
      );
    }

    fields.push("updated_at = datetime('now')");
    values.push(id);

    await client.execute({
      sql: `UPDATE estimates SET ${fields.join(', ')} WHERE id = ?`,
      args: values,
    });

    // Return the updated estimate
    const result = await client.execute({
      sql: `
        SELECT e.*, j.name as job_name
        FROM estimates e
        LEFT JOIN jobs j ON e.job_id = j.id
        WHERE e.id = ?
      `,
      args: [id],
    });

    const row = result.rows[0];
    const estimate = {
      id: row.id,
      user_id: row.user_id,
      job_id: row.job_id,
      status: row.status,
      title: row.title,
      total: Number(row.total),
      notes: row.notes,
      valid_until: row.valid_until,
      public_token: row.public_token,
      po_number: row.po_number,
      created_at: row.created_at,
      updated_at: row.updated_at,
      job_name: row.job_name,
    };

    return NextResponse.json({ success: true, data: estimate });
  } catch (error: any) {
    console.error('Error updating estimate:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// DELETE - delete an estimate
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Estimate ID is required' },
        { status: 400 }
      );
    }

    const client = getTurso();

    // Delete estimate items first
    await client.execute({
      sql: 'DELETE FROM estimate_items WHERE estimate_id = ?',
      args: [id],
    });

    // Delete estimate line items (enhanced)
    await client.execute({
      sql: 'DELETE FROM estimate_line_items WHERE estimate_id = ?',
      args: [id],
    });

    // Delete the estimate
    await client.execute({
      sql: 'DELETE FROM estimates WHERE id = ?',
      args: [id],
    });

    return NextResponse.json({ success: true, message: 'Estimate deleted' });
  } catch (error: any) {
    console.error('Error deleting estimate:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
