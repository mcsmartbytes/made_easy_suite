import { NextRequest, NextResponse } from 'next/server';
import { getTurso } from '@/lib/turso';

// PUT - Update a job
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const client = getTurso();

    const allowedFields = [
      'name', 'client_name', 'status', 'property_address', 'city', 'state', 'zip',
      'structure_type', 'roof_type', 'roof_pitch', 'layers', 'measured_squares',
      'dumpster_size', 'dumpster_hauler', 'start_date', 'end_date', 'notes'
    ];

    const fields: string[] = [];
    const values: (string | number | null)[] = [];

    for (const [key, value] of Object.entries(body)) {
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
      sql: `UPDATE jobs SET ${fields.join(', ')} WHERE id = ?`,
      args: values,
    });

    // Return updated job
    const result = await client.execute({
      sql: `
        SELECT j.*, i.name as industry_name
        FROM jobs j
        LEFT JOIN industries i ON j.industry_id = i.id
        WHERE j.id = ?
      `,
      args: [id],
    });

    return NextResponse.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error: any) {
    console.error('Error updating job:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// GET - Get a single job by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const client = getTurso();

    const result = await client.execute({
      sql: `
        SELECT j.*, i.name as industry_name
        FROM jobs j
        LEFT JOIN industries i ON j.industry_id = i.id
        WHERE j.id = ?
      `,
      args: [id],
    });

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Job not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error: any) {
    console.error('Error fetching job:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
