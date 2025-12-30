import { NextRequest, NextResponse } from 'next/server';
import { getTurso, generateId } from '@/lib/turso';

// GET - Get tasks for a job
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: jobId } = await params;

    const client = getTurso();

    const result = await client.execute({
      sql: `
        SELECT * FROM job_tasks
        WHERE job_id = ?
        ORDER BY sort_order ASC
      `,
      args: [jobId],
    });

    const tasks = result.rows.map((row: any) => ({
      ...row,
      estimated_hours: row.estimated_hours !== null ? Number(row.estimated_hours) : null,
    }));

    return NextResponse.json({
      success: true,
      data: tasks,
    });
  } catch (error: any) {
    console.error('Error fetching job tasks:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// POST - Create a task for a job
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: jobId } = await params;
    const body = await request.json();
    const { phase_id, name, status, assignee, due_date, estimated_hours, notes } = body;

    if (!name) {
      return NextResponse.json(
        { success: false, error: 'name is required' },
        { status: 400 }
      );
    }

    const client = getTurso();
    const id = generateId();

    await client.execute({
      sql: `
        INSERT INTO job_tasks (id, job_id, phase_id, name, status, assignee, due_date, estimated_hours, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      args: [
        id,
        jobId,
        phase_id || null,
        name,
        status || 'todo',
        assignee || null,
        due_date || null,
        estimated_hours || null,
        notes || null,
      ],
    });

    return NextResponse.json({
      success: true,
      data: { id, job_id: jobId, phase_id, name, status: status || 'todo' },
    });
  } catch (error: any) {
    console.error('Error creating task:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// PUT - Update a task
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

    const allowedFields = ['phase_id', 'name', 'status', 'assignee', 'due_date', 'estimated_hours', 'notes', 'sort_order'];
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

    values.push(id);

    await client.execute({
      sql: `UPDATE job_tasks SET ${fields.join(', ')} WHERE id = ?`,
      args: values,
    });

    return NextResponse.json({
      success: true,
      message: 'Task updated',
    });
  } catch (error: any) {
    console.error('Error updating task:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
