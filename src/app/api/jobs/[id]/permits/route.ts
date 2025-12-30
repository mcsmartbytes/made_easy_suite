import { NextRequest, NextResponse } from 'next/server';
import { getTurso, generateId } from '@/lib/turso';

// GET - Get permits for a job
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: jobId } = await params;

    const client = getTurso();

    const result = await client.execute({
      sql: `
        SELECT * FROM permits
        WHERE job_id = ?
        ORDER BY created_at DESC
      `,
      args: [jobId],
    });

    return NextResponse.json({
      success: true,
      data: result.rows,
    });
  } catch (error: any) {
    console.error('Error fetching permits:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// POST - Create a permit for a job
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: jobId } = await params;
    const body = await request.json();
    const { user_id, permit_number, authority, status, inspection_date, notes } = body;

    if (!user_id) {
      return NextResponse.json(
        { success: false, error: 'user_id is required' },
        { status: 400 }
      );
    }

    const client = getTurso();
    const id = generateId();

    await client.execute({
      sql: `
        INSERT INTO permits (id, job_id, user_id, permit_type, permit_number, authority, status, inspection_date, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      args: [
        id,
        jobId,
        user_id,
        'General',
        permit_number || null,
        authority || null,
        status || 'draft',
        inspection_date || null,
        notes || null,
      ],
    });

    return NextResponse.json({
      success: true,
      data: { id, job_id: jobId, user_id, permit_number, authority, status: status || 'draft' },
    });
  } catch (error: any) {
    console.error('Error creating permit:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// PUT - Update a permit
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, permit_number, authority, status, inspection_date, notes } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Permit ID is required' },
        { status: 400 }
      );
    }

    const client = getTurso();

    const fields: string[] = [];
    const values: (string | null)[] = [];

    if (permit_number !== undefined) {
      fields.push('permit_number = ?');
      values.push(permit_number || null);
    }
    if (authority !== undefined) {
      fields.push('authority = ?');
      values.push(authority || null);
    }
    if (status !== undefined) {
      fields.push('status = ?');
      values.push(status);
    }
    if (inspection_date !== undefined) {
      fields.push('inspection_date = ?');
      values.push(inspection_date || null);
    }
    if (notes !== undefined) {
      fields.push('notes = ?');
      values.push(notes || null);
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
      sql: `UPDATE permits SET ${fields.join(', ')} WHERE id = ?`,
      args: values,
    });

    const result = await client.execute({
      sql: 'SELECT * FROM permits WHERE id = ?',
      args: [id],
    });

    return NextResponse.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error: any) {
    console.error('Error updating permit:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// DELETE - Delete a permit
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
      sql: 'DELETE FROM permits WHERE id = ?',
      args: [id],
    });

    return NextResponse.json({
      success: true,
      message: 'Permit deleted',
    });
  } catch (error: any) {
    console.error('Error deleting permit:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
