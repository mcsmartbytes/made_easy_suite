import { NextRequest, NextResponse } from 'next/server';
import { getTurso, generateId } from '@/lib/turso';

// GET - Fetch work orders
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');
    const propertyId = searchParams.get('property_id');
    const status = searchParams.get('status');
    const priority = searchParams.get('priority');
    const workOrderId = searchParams.get('id');

    const client = getTurso();

    if (workOrderId) {
      const result = await client.execute({
        sql: `
          SELECT wo.*, j.name as property_name, u.unit_number, t.first_name, t.last_name, s.company_name as vendor_name
          FROM work_orders wo
          LEFT JOIN jobs j ON wo.property_id = j.id
          LEFT JOIN units u ON wo.unit_id = u.id
          LEFT JOIN tenants t ON wo.tenant_id = t.id
          LEFT JOIN subcontractors s ON wo.assigned_vendor_id = s.id
          WHERE wo.id = ?
        `,
        args: [workOrderId],
      });

      if (result.rows.length === 0) {
        return NextResponse.json({ success: false, error: 'Work order not found' }, { status: 404 });
      }

      const wo = result.rows[0] as any;
      return NextResponse.json({
        success: true,
        data: {
          ...wo,
          tenant_name: wo.first_name ? `${wo.first_name} ${wo.last_name || ''}`.trim() : null,
          estimated_cost: Number(wo.estimated_cost || 0),
          actual_cost: Number(wo.actual_cost || 0),
        },
      });
    }

    if (!userId) {
      return NextResponse.json({ success: false, error: 'User ID is required' }, { status: 400 });
    }

    let sql = `
      SELECT wo.*, j.name as property_name, u.unit_number, t.first_name, t.last_name, s.company_name as vendor_name
      FROM work_orders wo
      LEFT JOIN jobs j ON wo.property_id = j.id
      LEFT JOIN units u ON wo.unit_id = u.id
      LEFT JOIN tenants t ON wo.tenant_id = t.id
      LEFT JOIN subcontractors s ON wo.assigned_vendor_id = s.id
      WHERE wo.user_id = ?
    `;
    const args: (string | number)[] = [userId];

    if (propertyId) {
      sql += ' AND wo.property_id = ?';
      args.push(propertyId);
    }
    if (status) {
      sql += ' AND wo.status = ?';
      args.push(status);
    }
    if (priority) {
      sql += ' AND wo.priority = ?';
      args.push(priority);
    }

    sql += ' ORDER BY CASE wo.priority WHEN "emergency" THEN 1 WHEN "urgent" THEN 2 WHEN "normal" THEN 3 ELSE 4 END, wo.created_at DESC';

    const result = await client.execute({ sql, args });

    const workOrders = result.rows.map((row: any) => ({
      ...row,
      tenant_name: row.first_name ? `${row.first_name} ${row.last_name || ''}`.trim() : null,
      estimated_cost: Number(row.estimated_cost || 0),
      actual_cost: Number(row.actual_cost || 0),
    }));

    return NextResponse.json({ success: true, data: workOrders });
  } catch (error: any) {
    console.error('Error fetching work orders:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST - Create a work order
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      user_id, property_id, unit_id, tenant_id,
      title, description, category, priority,
      access_instructions, permission_to_enter,
    } = body;

    if (!user_id || !property_id || !title) {
      return NextResponse.json(
        { success: false, error: 'user_id, property_id, and title are required' },
        { status: 400 }
      );
    }

    const client = getTurso();
    const id = generateId();

    // Generate work order number
    const countResult = await client.execute({
      sql: 'SELECT COUNT(*) as count FROM work_orders WHERE user_id = ?',
      args: [user_id],
    });
    const count = Number((countResult.rows[0] as any)?.count || 0) + 1;
    const workOrderNumber = `WO-${String(count).padStart(5, '0')}`;

    await client.execute({
      sql: `
        INSERT INTO work_orders (id, user_id, property_id, unit_id, tenant_id, work_order_number, title, description, category, priority, access_instructions, permission_to_enter)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      args: [
        id, user_id, property_id, unit_id || null, tenant_id || null,
        workOrderNumber, title, description || null, category || null,
        priority || 'normal', access_instructions || null, permission_to_enter ? 1 : 0,
      ],
    });

    const result = await client.execute({ sql: 'SELECT * FROM work_orders WHERE id = ?', args: [id] });
    return NextResponse.json({ success: true, data: result.rows[0] });
  } catch (error: any) {
    console.error('Error creating work order:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// PUT - Update a work order
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Work order ID is required' }, { status: 400 });
    }

    const client = getTurso();
    const allowedFields = ['title', 'description', 'category', 'priority', 'status', 'assigned_vendor_id', 'scheduled_date', 'scheduled_time_start', 'scheduled_time_end', 'access_instructions', 'permission_to_enter', 'estimated_cost', 'actual_cost', 'completion_notes', 'completed_at'];

    const fields: string[] = [];
    const values: (string | number | null)[] = [];

    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key)) {
        fields.push(`${key} = ?`);
        if (key === 'permission_to_enter') {
          values.push(value ? 1 : 0);
        } else {
          values.push(value as string | number | null);
        }
      }
    }

    // Handle status changes
    if (updates.status === 'assigned' && updates.assigned_vendor_id) {
      fields.push("assigned_at = datetime('now')");
    }
    if (updates.status === 'completed') {
      fields.push("completed_at = datetime('now')");
    }

    if (fields.length === 0) {
      return NextResponse.json({ success: false, error: 'No valid fields to update' }, { status: 400 });
    }

    fields.push("updated_at = datetime('now')");
    values.push(id);

    await client.execute({ sql: `UPDATE work_orders SET ${fields.join(', ')} WHERE id = ?`, args: values });

    const result = await client.execute({ sql: 'SELECT * FROM work_orders WHERE id = ?', args: [id] });
    return NextResponse.json({ success: true, data: result.rows[0] });
  } catch (error: any) {
    console.error('Error updating work order:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// DELETE - Delete a work order
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'Work order ID is required' }, { status: 400 });
    }

    const client = getTurso();
    await client.execute({ sql: 'DELETE FROM work_orders WHERE id = ?', args: [id] });

    return NextResponse.json({ success: true, message: 'Work order deleted' });
  } catch (error: any) {
    console.error('Error deleting work order:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
