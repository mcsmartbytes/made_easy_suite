import { NextRequest, NextResponse } from 'next/server';
import { getTurso, generateId } from '@/lib/turso';

// GET - Get allowances for an estimate
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
        FROM estimate_allowances a
        LEFT JOIN cost_codes cc ON a.cost_code_id = cc.id
        WHERE a.estimate_id = ?
        ORDER BY a.created_at ASC
      `,
      args: [estimateId],
    });

    const allowances = result.rows.map((row: any) => ({
      ...row,
      amount: Number(row.amount || 0),
      actual_amount: row.actual_amount ? Number(row.actual_amount) : null,
      variance: row.variance ? Number(row.variance) : null,
      is_owner_selection: Boolean(row.is_owner_selection),
    }));

    return NextResponse.json({ success: true, data: allowances });
  } catch (error: any) {
    console.error('Error fetching estimate allowances:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// POST - Create an allowance
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: estimateId } = await params;
    const body = await request.json();
    const { name, description, amount, cost_code_id, is_owner_selection, notes } = body;

    if (!name || amount === undefined) {
      return NextResponse.json(
        { success: false, error: 'Name and amount are required' },
        { status: 400 }
      );
    }

    const client = getTurso();
    const id = generateId();

    await client.execute({
      sql: `
        INSERT INTO estimate_allowances (id, estimate_id, name, description, amount, cost_code_id, is_owner_selection, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
      args: [
        id,
        estimateId,
        name,
        description || null,
        amount,
        cost_code_id || null,
        is_owner_selection !== false ? 1 : 0,
        notes || null,
      ],
    });

    const result = await client.execute({
      sql: 'SELECT * FROM estimate_allowances WHERE id = ?',
      args: [id],
    });

    return NextResponse.json({ success: true, data: result.rows[0] });
  } catch (error: any) {
    console.error('Error creating estimate allowance:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// PUT - Update an allowance
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, name, description, amount, cost_code_id, is_owner_selection, status, actual_amount, notes } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Allowance ID is required' },
        { status: 400 }
      );
    }

    const client = getTurso();

    const fields: string[] = [];
    const values: (string | number | null)[] = [];

    if (name !== undefined) {
      fields.push('name = ?');
      values.push(name);
    }
    if (description !== undefined) {
      fields.push('description = ?');
      values.push(description);
    }
    if (amount !== undefined) {
      fields.push('amount = ?');
      values.push(amount);
    }
    if (cost_code_id !== undefined) {
      fields.push('cost_code_id = ?');
      values.push(cost_code_id);
    }
    if (is_owner_selection !== undefined) {
      fields.push('is_owner_selection = ?');
      values.push(is_owner_selection ? 1 : 0);
    }
    if (status !== undefined) {
      fields.push('status = ?');
      values.push(status);
    }
    if (actual_amount !== undefined) {
      fields.push('actual_amount = ?');
      values.push(actual_amount);
      // Calculate variance
      const currentResult = await client.execute({
        sql: 'SELECT amount FROM estimate_allowances WHERE id = ?',
        args: [id],
      });
      if (currentResult.rows.length > 0) {
        const originalAmount = amount !== undefined ? amount : Number((currentResult.rows[0] as any).amount);
        fields.push('variance = ?');
        values.push(actual_amount - originalAmount);
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
      sql: `UPDATE estimate_allowances SET ${fields.join(', ')} WHERE id = ?`,
      args: values,
    });

    const result = await client.execute({
      sql: 'SELECT * FROM estimate_allowances WHERE id = ?',
      args: [id],
    });

    return NextResponse.json({ success: true, data: result.rows[0] });
  } catch (error: any) {
    console.error('Error updating estimate allowance:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// DELETE - Delete an allowance
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Allowance ID is required' },
        { status: 400 }
      );
    }

    const client = getTurso();

    await client.execute({
      sql: 'DELETE FROM estimate_allowances WHERE id = ?',
      args: [id],
    });

    return NextResponse.json({ success: true, message: 'Allowance deleted' });
  } catch (error: any) {
    console.error('Error deleting estimate allowance:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
