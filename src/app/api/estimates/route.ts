import { NextRequest, NextResponse } from 'next/server';
import { getTurso, generateId } from '@/lib/turso';
import crypto from 'crypto';

// GET - fetch all estimates for a user
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');
    const jobId = searchParams.get('job_id');

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User ID is required' },
        { status: 400 }
      );
    }

    const client = getTurso();

    let sql = `
      SELECT e.*, j.name as job_name, c.first_name, c.last_name, c.email as contact_email
      FROM estimates e
      LEFT JOIN jobs j ON e.job_id = j.id
      LEFT JOIN contacts c ON e.contact_id = c.id
      WHERE e.user_id = ?
    `;
    const args: (string | null)[] = [userId];

    if (jobId) {
      sql += ' AND e.job_id = ?';
      args.push(jobId);
    }

    sql += ' ORDER BY e.created_at DESC';

    const result = await client.execute({ sql, args });

    const estimates = result.rows.map(row => ({
      id: row.id,
      user_id: row.user_id,
      job_id: row.job_id,
      contact_id: row.contact_id,
      status: row.status,
      total: Number(row.total),
      notes: row.notes,
      valid_until: row.valid_until,
      public_token: row.public_token,
      po_number: row.po_number,
      created_at: row.created_at,
      updated_at: row.updated_at,
      jobs: row.job_name ? { name: row.job_name } : null,
      contacts: row.first_name ? {
        first_name: row.first_name,
        last_name: row.last_name,
        email: row.contact_email,
      } : null,
    }));

    return NextResponse.json({ success: true, data: estimates });
  } catch (error: any) {
    console.error('Error fetching estimates:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// POST - create a new estimate
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      user_id,
      job_id,
      contact_id,
      status,
      title,
      client_name,
      client_email,
      client_phone,
      client_address,
      project_address,
      estimate_date,
      valid_until,
      po_number,
      payment_terms,
      scope_of_work,
      notes,
      terms_and_conditions,
      subtotal,
      discount_type,
      discount_value,
      discount_amount,
      tax_rate,
      tax_amount,
      total,
    } = body;

    if (!user_id) {
      return NextResponse.json(
        { success: false, error: 'user_id is required' },
        { status: 400 }
      );
    }

    const client = getTurso();
    const id = generateId();
    const publicToken = crypto.randomBytes(16).toString('hex');

    await client.execute({
      sql: `
        INSERT INTO estimates (
          id, user_id, job_id, contact_id, status, title,
          client_name, client_email, client_phone, client_address, project_address,
          estimate_date, valid_until, po_number, payment_terms,
          scope_of_work, notes, terms_and_conditions,
          subtotal, discount_type, discount_value, discount_amount,
          tax_rate, tax_amount, total, public_token
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      args: [
        id,
        user_id,
        job_id || null,
        contact_id || null,
        status || 'draft',
        title || null,
        client_name || null,
        client_email || null,
        client_phone || null,
        client_address || null,
        project_address || null,
        estimate_date || null,
        valid_until || null,
        po_number || null,
        payment_terms || null,
        scope_of_work || null,
        notes || null,
        terms_and_conditions || null,
        subtotal || 0,
        discount_type || 'percent',
        discount_value || 0,
        discount_amount || 0,
        tax_rate || 0,
        tax_amount || 0,
        total || 0,
        publicToken,
      ],
    });

    // Return the created estimate
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
      contact_id: row.contact_id,
      status: row.status,
      title: row.title,
      total: Number(row.total),
      notes: row.notes,
      valid_until: row.valid_until,
      public_token: row.public_token,
      po_number: row.po_number,
      created_at: row.created_at,
      jobs: row.job_name ? { name: row.job_name } : null,
    };

    return NextResponse.json({ success: true, data: estimate });
  } catch (error: any) {
    console.error('Error creating estimate:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// PUT - update an estimate
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Estimate ID is required' },
        { status: 400 }
      );
    }

    const client = getTurso();

    const allowedFields = [
      'job_id', 'contact_id', 'status', 'total', 'notes', 'valid_until', 'po_number',
    ];

    const fields: string[] = [];
    const values: (string | number | null)[] = [];

    for (const [key, value] of Object.entries(updates)) {
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
      contact_id: row.contact_id,
      status: row.status,
      total: Number(row.total),
      notes: row.notes,
      valid_until: row.valid_until,
      public_token: row.public_token,
      po_number: row.po_number,
      created_at: row.created_at,
      updated_at: row.updated_at,
      jobs: row.job_name ? { name: row.job_name } : null,
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
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Estimate ID is required' },
        { status: 400 }
      );
    }

    const client = getTurso();

    // Also delete estimate items
    await client.execute({
      sql: 'DELETE FROM estimate_items WHERE estimate_id = ?',
      args: [id],
    });

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
