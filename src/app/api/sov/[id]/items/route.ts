import { NextRequest, NextResponse } from 'next/server';
import { getTurso, generateId } from '@/lib/turso';

// GET - Get line items for a SOV
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sovId } = await params;

    const client = getTurso();

    const result = await client.execute({
      sql: `
        SELECT li.*, cc.code as cost_code, cc.name as cost_code_name
        FROM sov_line_items li
        LEFT JOIN cost_codes cc ON li.cost_code_id = cc.id
        WHERE li.sov_id = ?
        ORDER BY li.sort_order ASC
      `,
      args: [sovId],
    });

    const items = result.rows.map((row: any) => ({
      ...row,
      scheduled_value: Number(row.scheduled_value || 0),
      approved_changes: Number(row.approved_changes || 0),
      revised_value: Number(row.revised_value || 0),
      previous_billed: Number(row.previous_billed || 0),
      current_billed: Number(row.current_billed || 0),
      total_billed: Number(row.total_billed || 0),
      percent_complete: Number(row.percent_complete || 0),
      balance_to_finish: Number(row.balance_to_finish || 0),
      retainage_percent: Number(row.retainage_percent || 10),
      retainage_held: Number(row.retainage_held || 0),
      sort_order: Number(row.sort_order || 0),
    }));

    return NextResponse.json({ success: true, data: items });
  } catch (error: any) {
    console.error('Error fetching SOV items:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// POST - Add line item to SOV
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sovId } = await params;
    const body = await request.json();
    const {
      line_number,
      cost_code_id,
      description,
      scheduled_value,
      retainage_percent,
      notes,
    } = body;

    if (!description) {
      return NextResponse.json(
        { success: false, error: 'description is required' },
        { status: 400 }
      );
    }

    const client = getTurso();
    const id = generateId();

    // Get next sort order
    const countResult = await client.execute({
      sql: 'SELECT MAX(sort_order) as max_order FROM sov_line_items WHERE sov_id = ?',
      args: [sovId],
    });
    const sortOrder = (Number((countResult.rows[0] as any)?.max_order) || 0) + 1;

    const value = Number(scheduled_value || 0);

    await client.execute({
      sql: `
        INSERT INTO sov_line_items (
          id, sov_id, line_number, cost_code_id, description,
          scheduled_value, revised_value, balance_to_finish,
          retainage_percent, sort_order, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      args: [
        id,
        sovId,
        line_number || String(sortOrder),
        cost_code_id || null,
        description,
        value,
        value,
        value,
        retainage_percent || 10,
        sortOrder,
        notes || null,
      ],
    });

    // Update SOV total
    await updateSOVTotal(sovId);

    const result = await client.execute({
      sql: 'SELECT * FROM sov_line_items WHERE id = ?',
      args: [id],
    });

    return NextResponse.json({ success: true, data: result.rows[0] });
  } catch (error: any) {
    console.error('Error creating SOV item:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// PUT - Update line item
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { item_id, ...updates } = body;

    if (!item_id) {
      return NextResponse.json(
        { success: false, error: 'item_id is required' },
        { status: 400 }
      );
    }

    const client = getTurso();

    const allowedFields = [
      'line_number', 'cost_code_id', 'description',
      'scheduled_value', 'approved_changes',
      'retainage_percent', 'sort_order', 'notes',
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
        { success: false, error: 'No fields to update' },
        { status: 400 }
      );
    }

    values.push(item_id);

    await client.execute({
      sql: `UPDATE sov_line_items SET ${fields.join(', ')} WHERE id = ?`,
      args: values,
    });

    // Recalculate derived fields
    const itemResult = await client.execute({
      sql: 'SELECT * FROM sov_line_items WHERE id = ?',
      args: [item_id],
    });

    if (itemResult.rows.length > 0) {
      const item = itemResult.rows[0] as any;
      const scheduledValue = Number(item.scheduled_value || 0);
      const approvedChanges = Number(item.approved_changes || 0);
      const revisedValue = scheduledValue + approvedChanges;
      const totalBilled = Number(item.previous_billed || 0) + Number(item.current_billed || 0);
      const percentComplete = revisedValue > 0 ? (totalBilled / revisedValue) * 100 : 0;
      const balanceToFinish = revisedValue - totalBilled;
      const retainagePercent = Number(item.retainage_percent || 10);
      const retainageHeld = totalBilled * (retainagePercent / 100);

      await client.execute({
        sql: `
          UPDATE sov_line_items SET
            revised_value = ?,
            total_billed = ?,
            percent_complete = ?,
            balance_to_finish = ?,
            retainage_held = ?
          WHERE id = ?
        `,
        args: [revisedValue, totalBilled, percentComplete, balanceToFinish, retainageHeld, item_id],
      });

      // Update SOV total
      await updateSOVTotal(item.sov_id);
    }

    const result = await client.execute({
      sql: 'SELECT * FROM sov_line_items WHERE id = ?',
      args: [item_id],
    });

    return NextResponse.json({ success: true, data: result.rows[0] });
  } catch (error: any) {
    console.error('Error updating SOV item:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// DELETE - Delete line item
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const itemId = searchParams.get('item_id');

    if (!itemId) {
      return NextResponse.json(
        { success: false, error: 'item_id is required' },
        { status: 400 }
      );
    }

    const client = getTurso();

    // Get SOV ID before deleting
    const itemResult = await client.execute({
      sql: 'SELECT sov_id FROM sov_line_items WHERE id = ?',
      args: [itemId],
    });

    const sovId = (itemResult.rows[0] as any)?.sov_id;

    await client.execute({
      sql: 'DELETE FROM sov_line_items WHERE id = ?',
      args: [itemId],
    });

    // Update SOV total
    if (sovId) {
      await updateSOVTotal(sovId);
    }

    return NextResponse.json({ success: true, message: 'Line item deleted' });
  } catch (error: any) {
    console.error('Error deleting SOV item:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// Helper to update SOV total
async function updateSOVTotal(sovId: string) {
  const client = getTurso();
  const totalResult = await client.execute({
    sql: 'SELECT SUM(scheduled_value) as total FROM sov_line_items WHERE sov_id = ?',
    args: [sovId],
  });
  const total = Number((totalResult.rows[0] as any)?.total || 0);
  await client.execute({
    sql: "UPDATE schedule_of_values SET total_contract_amount = ?, updated_at = datetime('now') WHERE id = ?",
    args: [total, sovId],
  });
}
