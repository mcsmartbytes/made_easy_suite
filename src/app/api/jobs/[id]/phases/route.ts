import { NextRequest, NextResponse } from 'next/server';
import { getTurso, generateId } from '@/lib/turso';

// GET - Get phases for a job
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: jobId } = await params;

    const client = getTurso();

    const result = await client.execute({
      sql: `
        SELECT * FROM job_phases
        WHERE job_id = ?
        ORDER BY sort_order ASC
      `,
      args: [jobId],
    });

    return NextResponse.json({
      success: true,
      data: result.rows,
    });
  } catch (error: any) {
    console.error('Error fetching job phases:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// POST - Create a phase for a job
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: jobId } = await params;
    const body = await request.json();
    const { user_id, name, status, sort_order } = body;

    if (!user_id || !name) {
      return NextResponse.json(
        { success: false, error: 'user_id and name are required' },
        { status: 400 }
      );
    }

    const client = getTurso();
    const id = generateId();

    await client.execute({
      sql: `
        INSERT INTO job_phases (id, job_id, user_id, name, status, sort_order)
        VALUES (?, ?, ?, ?, ?, ?)
      `,
      args: [id, jobId, user_id, name, status || 'planned', sort_order || 0],
    });

    const result = await client.execute({
      sql: 'SELECT * FROM job_phases WHERE id = ?',
      args: [id],
    });

    return NextResponse.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error: any) {
    console.error('Error creating job phase:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// PUT - Update a phase
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const body = await request.json();
    const { id, status, name, sort_order } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Phase ID is required' },
        { status: 400 }
      );
    }

    const client = getTurso();

    const fields: string[] = [];
    const values: (string | number)[] = [];

    if (status !== undefined) {
      fields.push('status = ?');
      values.push(status);
    }
    if (name !== undefined) {
      fields.push('name = ?');
      values.push(name);
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

    fields.push("updated_at = datetime('now')");
    values.push(id);

    await client.execute({
      sql: `UPDATE job_phases SET ${fields.join(', ')} WHERE id = ?`,
      args: values,
    });

    const result = await client.execute({
      sql: 'SELECT * FROM job_phases WHERE id = ?',
      args: [id],
    });

    return NextResponse.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error: any) {
    console.error('Error updating job phase:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
