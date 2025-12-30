import { NextRequest, NextResponse } from 'next/server';
import { getTurso, generateId } from '@/lib/turso';

// GET - Get alternates for an estimate
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: estimateId } = await params;
    const client = getTurso();

    const result = await client.execute({
      sql: `
        SELECT a.*, cc.code as cost_code_value, cc.name as cost_code_name
        FROM estimate_alternates a
        LEFT JOIN cost_codes cc ON a.cost_code_id = cc.id
        WHERE a.estimate_id = ?
        ORDER BY a.alternate_number ASC, a.created_at ASC
      `,
      args: [estimateId],
    });

    const alternates = result.rows.map((row: any) => ({
      ...row,
      amount: Number(row.amount || 0),
    }));

    return NextResponse.json({ success: true, data: alternates });
  } catch (error: any) {
    console.error('Error fetching estimate alternates:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// POST - Create an alternate
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: estimateId } = await params;
    const body = await request.json();
    const { alternate_number, name, description, type, amount, cost_code_id, notes } = body;

    if (!name || !type || amount === undefined) {
      return NextResponse.json(
        { success: false, error: 'Name, type (add/deduct), and amount are required' },
        { status: 400 }
      );
    }

    if (!['add', 'deduct'].includes(type)) {
      return NextResponse.json(
        { success: false, error: 'Type must be "add" or "deduct"' },
        { status: 400 }
      );
    }

    const client = getTurso();
    const id = generateId();

    // Generate alternate number if not provided
    let altNumber = alternate_number;
    if (!altNumber) {
      const countResult = await client.execute({
        sql: 'SELECT COUNT(*) as count FROM estimate_alternates WHERE estimate_id = ?',
        args: [estimateId],
      });
      const count = Number((countResult.rows[0] as any)?.count || 0) + 1;
      altNumber = `ALT-${count}`;
    }

    await client.execute({
      sql: `
        INSERT INTO estimate_alternates (id, estimate_id, alternate_number, name, description, type, amount, cost_code_id, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      args: [
        id,
        estimateId,
        altNumber,
        name,
        description || null,
        type,
        amount,
        cost_code_id || null,
        notes || null,
      ],
    });

    const result = await client.execute({
      sql: 'SELECT * FROM estimate_alternates WHERE id = ?',
      args: [id],
    });

    return NextResponse.json({ success: true, data: result.rows[0] });
  } catch (error: any) {
    console.error('Error creating estimate alternate:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// PUT - Update an alternate
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, alternate_number, name, description, type, amount, cost_code_id, status, notes } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Alternate ID is required' },
        { status: 400 }
      );
    }

    const client = getTurso();

    const fields: string[] = [];
    const values: (string | number | null)[] = [];

    if (alternate_number !== undefined) {
      fields.push('alternate_number = ?');
      values.push(alternate_number);
    }
    if (name !== undefined) {
      fields.push('name = ?');
      values.push(name);
    }
    if (description !== undefined) {
      fields.push('description = ?');
      values.push(description);
    }
    if (type !== undefined) {
      if (!['add', 'deduct'].includes(type)) {
        return NextResponse.json(
          { success: false, error: 'Type must be "add" or "deduct"' },
          { status: 400 }
        );
      }
      fields.push('type = ?');
      values.push(type);
    }
    if (amount !== undefined) {
      fields.push('amount = ?');
      values.push(amount);
    }
    if (cost_code_id !== undefined) {
      fields.push('cost_code_id = ?');
      values.push(cost_code_id);
    }
    if (status !== undefined) {
      fields.push('status = ?');
      values.push(status);
      if (status === 'accepted') {
        fields.push("accepted_at = datetime('now')");
      } else {
        fields.push('accepted_at = NULL');
      }
    }
    if (notes !== undefined) {
      fields.push('notes = ?');
      values.push(notes);
    }

    if (fields.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No fields to update' },
        { status: 400 }
      );
    }

    values.push(id);

    await client.execute({
      sql: `UPDATE estimate_alternates SET ${fields.join(', ')} WHERE id = ?`,
      args: values,
    });

    const result = await client.execute({
      sql: 'SELECT * FROM estimate_alternates WHERE id = ?',
      args: [id],
    });

    return NextResponse.json({ success: true, data: result.rows[0] });
  } catch (error: any) {
    console.error('Error updating estimate alternate:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// DELETE - Delete an alternate
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Alternate ID is required' },
        { status: 400 }
      );
    }

    const client = getTurso();

    await client.execute({
      sql: 'DELETE FROM estimate_alternates WHERE id = ?',
      args: [id],
    });

    return NextResponse.json({ success: true, message: 'Alternate deleted' });
  } catch (error: any) {
    console.error('Error deleting estimate alternate:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
