import { NextRequest, NextResponse } from 'next/server';
import { getTurso, generateId } from '@/lib/turso';

// GET - List todos for a user
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');
    const status = searchParams.get('status');
    const jobId = searchParams.get('job_id');

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'user_id is required' },
        { status: 400 }
      );
    }

    const client = getTurso();

    let sql = `
      SELECT t.*, j.name as job_name
      FROM todos t
      LEFT JOIN jobs j ON t.job_id = j.id
      WHERE t.user_id = ?
    `;
    const args: (string | null)[] = [userId];

    if (status) {
      sql += ' AND t.status = ?';
      args.push(status);
    }

    if (jobId) {
      sql += ' AND t.job_id = ?';
      args.push(jobId);
    }

    sql += ' ORDER BY t.due_date ASC, t.priority DESC, t.created_at DESC';

    const result = await client.execute({ sql, args });

    return NextResponse.json({
      success: true,
      data: result.rows,
    });
  } catch (error: any) {
    console.error('Error fetching todos:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// POST - Create a new todo
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      user_id,
      title,
      description,
      status = 'pending',
      priority = 'medium',
      due_date,
      due_time,
      reminder_date,
      reminder_time,
      job_id,
    } = body;

    if (!user_id || !title) {
      return NextResponse.json(
        { success: false, error: 'user_id and title are required' },
        { status: 400 }
      );
    }

    const client = getTurso();
    const id = generateId();

    await client.execute({
      sql: `
        INSERT INTO todos (
          id, user_id, title, description, status, priority,
          due_date, due_time, reminder_date, reminder_time, job_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      args: [
        id,
        user_id,
        title,
        description || null,
        status,
        priority,
        due_date || null,
        due_time || null,
        reminder_date || null,
        reminder_time || null,
        job_id || null,
      ],
    });

    const result = await client.execute({
      sql: `
        SELECT t.*, j.name as job_name
        FROM todos t
        LEFT JOIN jobs j ON t.job_id = j.id
        WHERE t.id = ?
      `,
      args: [id],
    });

    return NextResponse.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error: any) {
    console.error('Error creating todo:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// PUT - Update a todo
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'id is required' },
        { status: 400 }
      );
    }

    const client = getTurso();

    const allowedFields = [
      'title', 'description', 'status', 'priority',
      'due_date', 'due_time', 'reminder_date', 'reminder_time',
      'job_id', 'completed_at',
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
      sql: `UPDATE todos SET ${fields.join(', ')} WHERE id = ?`,
      args: values,
    });

    const result = await client.execute({
      sql: `
        SELECT t.*, j.name as job_name
        FROM todos t
        LEFT JOIN jobs j ON t.job_id = j.id
        WHERE t.id = ?
      `,
      args: [id],
    });

    return NextResponse.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error: any) {
    console.error('Error updating todo:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// DELETE - Delete a todo
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'id is required' },
        { status: 400 }
      );
    }

    const client = getTurso();

    await client.execute({
      sql: 'DELETE FROM todos WHERE id = ?',
      args: [id],
    });

    return NextResponse.json({
      success: true,
      message: 'Todo deleted',
    });
  } catch (error: any) {
    console.error('Error deleting todo:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
