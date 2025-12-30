import { NextRequest, NextResponse } from 'next/server';
import { getTurso, generateId } from '@/lib/turso';

// GET - Fetch cost codes
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');
    const division = searchParams.get('division');
    const includeCustom = searchParams.get('include_custom') !== 'false';

    const client = getTurso();

    let sql = 'SELECT * FROM cost_codes WHERE is_default = 1';
    const args: (string | number)[] = [];

    if (includeCustom && userId) {
      sql = 'SELECT * FROM cost_codes WHERE is_default = 1 OR user_id = ?';
      args.push(userId);
    }

    if (division) {
      sql += ' AND division = ?';
      args.push(division);
    }

    sql += ' ORDER BY code ASC';

    const result = await client.execute({ sql, args });

    const codes = result.rows.map((row: any) => ({
      ...row,
      level: Number(row.level || 1),
      is_default: Boolean(row.is_default),
    }));

    return NextResponse.json({ success: true, data: codes });
  } catch (error: any) {
    console.error('Error fetching cost codes:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// POST - Create custom cost code
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      user_id,
      code,
      division,
      name,
      description,
      parent_code,
      level,
    } = body;

    if (!user_id || !code || !division || !name) {
      return NextResponse.json(
        { success: false, error: 'user_id, code, division, and name are required' },
        { status: 400 }
      );
    }

    const client = getTurso();
    const id = generateId();

    await client.execute({
      sql: `
        INSERT INTO cost_codes (id, user_id, code, division, name, description, parent_code, level, is_default)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)
      `,
      args: [
        id,
        user_id,
        code,
        division,
        name,
        description || null,
        parent_code || null,
        level || 2,
      ],
    });

    const result = await client.execute({
      sql: 'SELECT * FROM cost_codes WHERE id = ?',
      args: [id],
    });

    return NextResponse.json({ success: true, data: result.rows[0] });
  } catch (error: any) {
    console.error('Error creating cost code:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// PUT - Update custom cost code
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, code, division, name, description, parent_code, level } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Cost code ID is required' },
        { status: 400 }
      );
    }

    const client = getTurso();

    // Check if it's a custom code (can only edit custom codes)
    const check = await client.execute({
      sql: 'SELECT is_default FROM cost_codes WHERE id = ?',
      args: [id],
    });

    if (check.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Cost code not found' },
        { status: 404 }
      );
    }

    if ((check.rows[0] as any).is_default) {
      return NextResponse.json(
        { success: false, error: 'Cannot edit default cost codes' },
        { status: 400 }
      );
    }

    const fields: string[] = [];
    const values: (string | number | null)[] = [];

    if (code !== undefined) {
      fields.push('code = ?');
      values.push(code);
    }
    if (division !== undefined) {
      fields.push('division = ?');
      values.push(division);
    }
    if (name !== undefined) {
      fields.push('name = ?');
      values.push(name);
    }
    if (description !== undefined) {
      fields.push('description = ?');
      values.push(description);
    }
    if (parent_code !== undefined) {
      fields.push('parent_code = ?');
      values.push(parent_code);
    }
    if (level !== undefined) {
      fields.push('level = ?');
      values.push(level);
    }

    if (fields.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No fields to update' },
        { status: 400 }
      );
    }

    values.push(id);

    await client.execute({
      sql: `UPDATE cost_codes SET ${fields.join(', ')} WHERE id = ?`,
      args: values,
    });

    const result = await client.execute({
      sql: 'SELECT * FROM cost_codes WHERE id = ?',
      args: [id],
    });

    return NextResponse.json({ success: true, data: result.rows[0] });
  } catch (error: any) {
    console.error('Error updating cost code:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// DELETE - Delete custom cost code
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Cost code ID is required' },
        { status: 400 }
      );
    }

    const client = getTurso();

    // Only allow deleting custom codes
    const check = await client.execute({
      sql: 'SELECT is_default FROM cost_codes WHERE id = ?',
      args: [id],
    });

    if (check.rows.length > 0 && (check.rows[0] as any).is_default) {
      return NextResponse.json(
        { success: false, error: 'Cannot delete default cost codes' },
        { status: 400 }
      );
    }

    await client.execute({
      sql: 'DELETE FROM cost_codes WHERE id = ? AND is_default = 0',
      args: [id],
    });

    return NextResponse.json({ success: true, message: 'Cost code deleted' });
  } catch (error: any) {
    console.error('Error deleting cost code:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
