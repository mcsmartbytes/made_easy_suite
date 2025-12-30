import { NextRequest, NextResponse } from 'next/server';
import { getTurso, generateId } from '@/lib/turso';

// GET - Get sections for an estimate
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: estimateId } = await params;
    const client = getTurso();

    const result = await client.execute({
      sql: `
        SELECT s.*, cc.code as cost_code_value, cc.name as cost_code_name
        FROM estimate_sections s
        LEFT JOIN cost_codes cc ON s.cost_code = cc.code
        WHERE s.estimate_id = ?
        ORDER BY s.sort_order ASC
      `,
      args: [estimateId],
    });

    const sections = result.rows.map((row: any) => ({
      ...row,
      sort_order: Number(row.sort_order || 0),
    }));

    return NextResponse.json({ success: true, data: sections });
  } catch (error: any) {
    console.error('Error fetching estimate sections:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// POST - Create a section
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: estimateId } = await params;
    const body = await request.json();
    const { name, description, cost_code, sort_order } = body;

    if (!name) {
      return NextResponse.json(
        { success: false, error: 'Section name is required' },
        { status: 400 }
      );
    }

    const client = getTurso();
    const id = generateId();

    // Get next sort order if not provided
    let order = sort_order;
    if (order === undefined) {
      const maxResult = await client.execute({
        sql: 'SELECT MAX(sort_order) as max_order FROM estimate_sections WHERE estimate_id = ?',
        args: [estimateId],
      });
      order = (Number((maxResult.rows[0] as any)?.max_order) || 0) + 1;
    }

    await client.execute({
      sql: `
        INSERT INTO estimate_sections (id, estimate_id, name, description, cost_code, sort_order)
        VALUES (?, ?, ?, ?, ?, ?)
      `,
      args: [id, estimateId, name, description || null, cost_code || null, order],
    });

    const result = await client.execute({
      sql: 'SELECT * FROM estimate_sections WHERE id = ?',
      args: [id],
    });

    return NextResponse.json({ success: true, data: result.rows[0] });
  } catch (error: any) {
    console.error('Error creating estimate section:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// PUT - Update a section
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, name, description, cost_code, sort_order } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Section ID is required' },
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
    if (cost_code !== undefined) {
      fields.push('cost_code = ?');
      values.push(cost_code);
    }
    if (sort_order !== undefined) {
      fields.push('sort_order = ?');
      values.push(sort_order);
    }

    if (fields.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No fields to update' },
        { status: 400 }
      );
    }

    values.push(id);

    await client.execute({
      sql: `UPDATE estimate_sections SET ${fields.join(', ')} WHERE id = ?`,
      args: values,
    });

    const result = await client.execute({
      sql: 'SELECT * FROM estimate_sections WHERE id = ?',
      args: [id],
    });

    return NextResponse.json({ success: true, data: result.rows[0] });
  } catch (error: any) {
    console.error('Error updating estimate section:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// DELETE - Delete a section
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Section ID is required' },
        { status: 400 }
      );
    }

    const client = getTurso();

    // Remove section reference from items
    await client.execute({
      sql: 'UPDATE estimate_line_items SET section_id = NULL WHERE section_id = ?',
      args: [id],
    });

    await client.execute({
      sql: 'DELETE FROM estimate_sections WHERE id = ?',
      args: [id],
    });

    return NextResponse.json({ success: true, message: 'Section deleted' });
  } catch (error: any) {
    console.error('Error deleting estimate section:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
