import { NextRequest, NextResponse } from 'next/server';
import { getTurso, generateId } from '@/lib/turso';

// GET - Fetch tenants
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');
    const status = searchParams.get('status');
    const tenantId = searchParams.get('id');

    const client = getTurso();

    if (tenantId) {
      const result = await client.execute({
        sql: 'SELECT * FROM tenants WHERE id = ?',
        args: [tenantId],
      });

      if (result.rows.length === 0) {
        return NextResponse.json({ success: false, error: 'Tenant not found' }, { status: 404 });
      }

      return NextResponse.json({ success: true, data: result.rows[0] });
    }

    if (!userId) {
      return NextResponse.json({ success: false, error: 'User ID is required' }, { status: 400 });
    }

    let sql = 'SELECT * FROM tenants WHERE user_id = ?';
    const args: (string | number)[] = [userId];

    if (status) {
      sql += ' AND status = ?';
      args.push(status);
    }

    sql += ' ORDER BY last_name ASC, first_name ASC';

    const result = await client.execute({ sql, args });

    return NextResponse.json({ success: true, data: result.rows });
  } catch (error: any) {
    console.error('Error fetching tenants:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST - Create a tenant
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      user_id, first_name, last_name, company_name,
      email, phone, mobile, emergency_contact_name, emergency_contact_phone,
      status, notes,
    } = body;

    if (!user_id || !first_name) {
      return NextResponse.json(
        { success: false, error: 'user_id and first_name are required' },
        { status: 400 }
      );
    }

    const client = getTurso();
    const id = generateId();

    await client.execute({
      sql: `
        INSERT INTO tenants (id, user_id, first_name, last_name, company_name, email, phone, mobile, emergency_contact_name, emergency_contact_phone, status, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      args: [
        id, user_id, first_name, last_name || null, company_name || null,
        email || null, phone || null, mobile || null,
        emergency_contact_name || null, emergency_contact_phone || null,
        status || 'prospect', notes || null,
      ],
    });

    const result = await client.execute({ sql: 'SELECT * FROM tenants WHERE id = ?', args: [id] });
    return NextResponse.json({ success: true, data: result.rows[0] });
  } catch (error: any) {
    console.error('Error creating tenant:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// PUT - Update a tenant
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Tenant ID is required' }, { status: 400 });
    }

    const client = getTurso();
    const allowedFields = ['first_name', 'last_name', 'company_name', 'email', 'phone', 'mobile', 'emergency_contact_name', 'emergency_contact_phone', 'status', 'credit_score', 'background_check_date', 'background_check_status', 'preferred_contact_method', 'notes'];

    const fields: string[] = [];
    const values: (string | number | null)[] = [];

    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key)) {
        fields.push(`${key} = ?`);
        values.push(value as string | number | null);
      }
    }

    if (fields.length === 0) {
      return NextResponse.json({ success: false, error: 'No valid fields to update' }, { status: 400 });
    }

    fields.push("updated_at = datetime('now')");
    values.push(id);

    await client.execute({ sql: `UPDATE tenants SET ${fields.join(', ')} WHERE id = ?`, args: values });

    const result = await client.execute({ sql: 'SELECT * FROM tenants WHERE id = ?', args: [id] });
    return NextResponse.json({ success: true, data: result.rows[0] });
  } catch (error: any) {
    console.error('Error updating tenant:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// DELETE - Delete a tenant
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'Tenant ID is required' }, { status: 400 });
    }

    const client = getTurso();
    await client.execute({ sql: 'DELETE FROM tenants WHERE id = ?', args: [id] });

    return NextResponse.json({ success: true, message: 'Tenant deleted' });
  } catch (error: any) {
    console.error('Error deleting tenant:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
