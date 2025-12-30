import { NextRequest, NextResponse } from 'next/server';
import { getTurso, generateId } from '@/lib/turso';

// GET - Fetch leases
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');
    const propertyId = searchParams.get('property_id');
    const tenantId = searchParams.get('tenant_id');
    const status = searchParams.get('status');
    const leaseId = searchParams.get('id');

    const client = getTurso();

    if (leaseId) {
      const result = await client.execute({
        sql: `
          SELECT l.*, j.name as property_name, u.unit_number, t.first_name, t.last_name
          FROM leases l
          LEFT JOIN jobs j ON l.property_id = j.id
          LEFT JOIN units u ON l.unit_id = u.id
          LEFT JOIN tenants t ON l.tenant_id = t.id
          WHERE l.id = ?
        `,
        args: [leaseId],
      });

      if (result.rows.length === 0) {
        return NextResponse.json({ success: false, error: 'Lease not found' }, { status: 404 });
      }

      const lease = result.rows[0] as any;
      return NextResponse.json({
        success: true,
        data: {
          ...lease,
          monthly_rent: Number(lease.monthly_rent || 0),
          security_deposit: Number(lease.security_deposit || 0),
          tenant_name: lease.first_name ? `${lease.first_name} ${lease.last_name || ''}`.trim() : null,
        },
      });
    }

    if (!userId) {
      return NextResponse.json({ success: false, error: 'User ID is required' }, { status: 400 });
    }

    let sql = `
      SELECT l.*, j.name as property_name, u.unit_number, t.first_name, t.last_name
      FROM leases l
      LEFT JOIN jobs j ON l.property_id = j.id
      LEFT JOIN units u ON l.unit_id = u.id
      LEFT JOIN tenants t ON l.tenant_id = t.id
      WHERE l.user_id = ?
    `;
    const args: (string | number)[] = [userId];

    if (propertyId) {
      sql += ' AND l.property_id = ?';
      args.push(propertyId);
    }
    if (tenantId) {
      sql += ' AND l.tenant_id = ?';
      args.push(tenantId);
    }
    if (status) {
      sql += ' AND l.status = ?';
      args.push(status);
    }

    sql += ' ORDER BY l.start_date DESC';

    const result = await client.execute({ sql, args });

    const leases = result.rows.map((row: any) => ({
      ...row,
      monthly_rent: Number(row.monthly_rent || 0),
      security_deposit: Number(row.security_deposit || 0),
      tenant_name: row.first_name ? `${row.first_name} ${row.last_name || ''}`.trim() : null,
    }));

    return NextResponse.json({ success: true, data: leases });
  } catch (error: any) {
    console.error('Error fetching leases:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST - Create a lease
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      user_id, property_id, unit_id, tenant_id,
      lease_type, start_date, end_date,
      monthly_rent, security_deposit, pet_deposit,
      rent_due_day, late_fee_amount, late_fee_grace_days,
      status, notes,
    } = body;

    if (!user_id || !property_id || !tenant_id || !start_date || !monthly_rent) {
      return NextResponse.json(
        { success: false, error: 'user_id, property_id, tenant_id, start_date, and monthly_rent are required' },
        { status: 400 }
      );
    }

    const client = getTurso();
    const id = generateId();

    await client.execute({
      sql: `
        INSERT INTO leases (id, user_id, property_id, unit_id, tenant_id, lease_type, start_date, end_date, monthly_rent, security_deposit, pet_deposit, rent_due_day, late_fee_amount, late_fee_grace_days, status, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      args: [
        id, user_id, property_id, unit_id || null, tenant_id,
        lease_type || 'fixed', start_date, end_date || null,
        monthly_rent, security_deposit || null, pet_deposit || null,
        rent_due_day || 1, late_fee_amount || null, late_fee_grace_days || 5,
        status || 'draft', notes || null,
      ],
    });

    // Update unit with tenant and lease if unit_id provided
    if (unit_id) {
      await client.execute({
        sql: "UPDATE units SET current_tenant_id = ?, current_lease_id = ?, current_rent = ?, status = 'occupied' WHERE id = ?",
        args: [tenant_id, id, monthly_rent, unit_id],
      });
    }

    // Update tenant status
    await client.execute({
      sql: "UPDATE tenants SET status = 'active' WHERE id = ?",
      args: [tenant_id],
    });

    const result = await client.execute({ sql: 'SELECT * FROM leases WHERE id = ?', args: [id] });
    return NextResponse.json({ success: true, data: result.rows[0] });
  } catch (error: any) {
    console.error('Error creating lease:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// PUT - Update a lease
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Lease ID is required' }, { status: 400 });
    }

    const client = getTurso();
    const allowedFields = ['lease_type', 'start_date', 'end_date', 'monthly_rent', 'security_deposit', 'pet_deposit', 'rent_due_day', 'late_fee_amount', 'late_fee_grace_days', 'status', 'move_in_date', 'move_out_date', 'notes'];

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

    await client.execute({ sql: `UPDATE leases SET ${fields.join(', ')} WHERE id = ?`, args: values });

    const result = await client.execute({ sql: 'SELECT * FROM leases WHERE id = ?', args: [id] });
    return NextResponse.json({ success: true, data: result.rows[0] });
  } catch (error: any) {
    console.error('Error updating lease:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// DELETE - Delete a lease
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'Lease ID is required' }, { status: 400 });
    }

    const client = getTurso();

    // Clear unit reference
    await client.execute({
      sql: "UPDATE units SET current_tenant_id = NULL, current_lease_id = NULL, status = 'vacant' WHERE current_lease_id = ?",
      args: [id],
    });

    await client.execute({ sql: 'DELETE FROM leases WHERE id = ?', args: [id] });

    return NextResponse.json({ success: true, message: 'Lease deleted' });
  } catch (error: any) {
    console.error('Error deleting lease:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
