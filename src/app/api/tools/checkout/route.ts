import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne, execute, generateId } from '@/lib/turso';

// GET - get checkout history for a tool
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const toolId = searchParams.get('tool_id');
    const userId = searchParams.get('user_id');
    const activeOnly = searchParams.get('active_only') === 'true';

    let sql = `
      SELECT tc.*, t.id as tool_id, t.name as tool_name, t.qr_code,
             j.id as job_id, j.name as job_name
      FROM tool_checkouts tc
      LEFT JOIN tools t ON tc.tool_id = t.id
      LEFT JOIN jobs j ON tc.checked_out_to_job_id = j.id
      WHERE 1=1
    `;
    const args: (string | number | null)[] = [];

    if (toolId) {
      sql += ' AND tc.tool_id = ?';
      args.push(toolId);
    }

    if (userId) {
      sql += ' AND tc.user_id = ?';
      args.push(userId);
    }

    if (activeOnly) {
      sql += ' AND tc.checked_in_at IS NULL';
    }

    sql += ' ORDER BY tc.checked_out_at DESC';

    const rows = await query(sql, args);

    const data = rows.map((row: any) => ({
      ...row,
      tools: row.tool_id ? {
        id: row.tool_id,
        name: row.tool_name,
        qr_code: row.qr_code,
      } : null,
      jobs: row.job_id ? {
        id: row.job_id,
        name: row.job_name,
      } : null,
    }));

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('Error fetching checkouts:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// POST - check out a tool
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      tool_id,
      user_id,
      checked_out_to,
      checked_out_to_job_id,
      checkout_notes,
      checkout_location,
      expected_return_date,
      reminder_date,
    } = body;

    if (!tool_id || !user_id) {
      return NextResponse.json(
        { success: false, error: 'Tool ID and User ID are required' },
        { status: 400 }
      );
    }

    // Check if tool is already checked out
    const tool = await queryOne<{ status: string; name: string; condition: string }>(
      'SELECT status, name, condition FROM tools WHERE id = ?',
      [tool_id]
    );

    if (!tool) {
      return NextResponse.json(
        { success: false, error: 'Tool not found' },
        { status: 404 }
      );
    }

    if (tool.status === 'checked_out') {
      return NextResponse.json(
        { success: false, error: `${tool.name} is already checked out` },
        { status: 400 }
      );
    }

    const id = generateId();
    const now = new Date().toISOString();

    // Create checkout record
    await execute(
      `INSERT INTO tool_checkouts (
        id, tool_id, user_id, checked_out_at, checked_out_to,
        checked_out_to_job_id, checkout_notes, checkout_condition, checkout_location,
        expected_return_date, reminder_date, reminder_sent, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)`,
      [
        id,
        tool_id,
        user_id,
        now,
        checked_out_to || null,
        checked_out_to_job_id || null,
        checkout_notes || null,
        tool.condition,
        checkout_location || null,
        expected_return_date || null,
        reminder_date || null,
        now,
      ]
    );

    // Update tool status
    await execute(
      `UPDATE tools SET
        status = 'checked_out',
        current_location = ?,
        assigned_to_job = ?,
        assigned_at = ?,
        updated_at = ?
       WHERE id = ?`,
      [checkout_location || null, checked_out_to_job_id || null, now, now, tool_id]
    );

    const checkout = await queryOne('SELECT * FROM tool_checkouts WHERE id = ?', [id]);

    return NextResponse.json({ success: true, data: checkout });
  } catch (error: any) {
    console.error('Error checking out tool:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// PUT - check in a tool
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      checkout_id,
      tool_id,
      checkin_notes,
      checkin_condition,
      checkin_location,
    } = body;

    if (!checkout_id && !tool_id) {
      return NextResponse.json(
        { success: false, error: 'Checkout ID or Tool ID is required' },
        { status: 400 }
      );
    }

    // Find active checkout
    let activeCheckout: { id: string; tool_id: string } | null = null;

    if (checkout_id) {
      activeCheckout = await queryOne<{ id: string; tool_id: string }>(
        'SELECT id, tool_id FROM tool_checkouts WHERE id = ? AND checked_in_at IS NULL',
        [checkout_id]
      );
    } else if (tool_id) {
      activeCheckout = await queryOne<{ id: string; tool_id: string }>(
        'SELECT id, tool_id FROM tool_checkouts WHERE tool_id = ? AND checked_in_at IS NULL',
        [tool_id]
      );
    }

    if (!activeCheckout) {
      return NextResponse.json(
        { success: false, error: 'No active checkout found' },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();

    // Update checkout record
    await execute(
      `UPDATE tool_checkouts SET
        checked_in_at = ?,
        checkin_notes = ?,
        checkin_condition = ?,
        checkin_location = ?
       WHERE id = ?`,
      [now, checkin_notes || null, checkin_condition || null, checkin_location || null, activeCheckout.id]
    );

    // Get tool's home location
    const toolData = await queryOne<{ home_location: string | null }>(
      'SELECT home_location FROM tools WHERE id = ?',
      [activeCheckout.tool_id]
    );

    // Update tool status
    await execute(
      `UPDATE tools SET
        status = 'available',
        current_location = ?,
        condition = COALESCE(?, condition),
        assigned_to_job = NULL,
        assigned_at = NULL,
        updated_at = ?
       WHERE id = ?`,
      [
        checkin_location || toolData?.home_location || null,
        checkin_condition || null,
        now,
        activeCheckout.tool_id,
      ]
    );

    const checkout = await queryOne('SELECT * FROM tool_checkouts WHERE id = ?', [activeCheckout.id]);

    return NextResponse.json({ success: true, data: checkout });
  } catch (error: any) {
    console.error('Error checking in tool:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
