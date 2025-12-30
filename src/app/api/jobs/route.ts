import { NextRequest, NextResponse } from 'next/server';
import { getTurso, generateId } from '@/lib/turso';

// GET - List jobs for a user
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');
    const status = searchParams.get('status');

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'user_id is required' },
        { status: 400 }
      );
    }

    const client = getTurso();

    let sql = `
      SELECT
        j.id, j.name, j.client_name, j.client_id, j.industry_id,
        j.status, j.property_address, j.city, j.state, j.zip,
        j.structure_type, j.roof_type, j.roof_pitch, j.layers,
        j.measured_squares, j.dumpster_size, j.dumpster_hauler,
        j.start_date, j.end_date, j.notes, j.created_at, j.updated_at,
        i.name as industry_name
      FROM jobs j
      LEFT JOIN industries i ON j.industry_id = i.id
      WHERE j.user_id = ?
    `;
    const args: (string | null)[] = [userId];

    if (status) {
      sql += ' AND j.status = ?';
      args.push(status);
    }

    sql += ' ORDER BY j.created_at DESC';

    const result = await client.execute({ sql, args });

    // Transform rows to include industry object
    const jobs = result.rows.map((row: any) => ({
      ...row,
      industries: row.industry_name ? [{ name: row.industry_name }] : null,
    }));

    return NextResponse.json({
      success: true,
      data: jobs,
    });
  } catch (error: any) {
    console.error('Error fetching jobs:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// POST - Create a new job
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      user_id,
      name,
      client_name,
      client_id,
      industry_id,
      status = 'active',
      property_address,
      city,
      state,
      zip,
      structure_type,
      roof_type,
      roof_pitch,
      layers,
      measured_squares,
      dumpster_size,
      dumpster_hauler,
      start_date,
      end_date,
      notes,
    } = body;

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
        INSERT INTO jobs (
          id, user_id, name, client_name, client_id, industry_id, status,
          property_address, city, state, zip, structure_type, roof_type,
          roof_pitch, layers, measured_squares, dumpster_size, dumpster_hauler,
          start_date, end_date, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      args: [
        id,
        user_id,
        name,
        client_name || null,
        client_id || null,
        industry_id || null,
        status,
        property_address || null,
        city || null,
        state || null,
        zip || null,
        structure_type || null,
        roof_type || null,
        roof_pitch || null,
        layers || null,
        measured_squares || null,
        dumpster_size || null,
        dumpster_hauler || null,
        start_date || null,
        end_date || null,
        notes || null,
      ],
    });

    // Fetch the created job
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
    console.error('Error creating job:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// PUT - Update a job
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
      'name', 'client_name', 'client_id', 'industry_id', 'status',
      'property_address', 'city', 'state', 'zip', 'structure_type',
      'roof_type', 'roof_pitch', 'layers', 'measured_squares',
      'dumpster_size', 'dumpster_hauler', 'start_date', 'end_date', 'notes',
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
      sql: `UPDATE jobs SET ${fields.join(', ')} WHERE id = ?`,
      args: values,
    });

    // Fetch updated job
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

// DELETE - Delete a job
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
      sql: 'DELETE FROM jobs WHERE id = ?',
      args: [id],
    });

    return NextResponse.json({
      success: true,
      message: 'Job deleted',
    });
  } catch (error: any) {
    console.error('Error deleting job:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
