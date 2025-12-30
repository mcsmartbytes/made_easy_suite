import { NextRequest, NextResponse } from 'next/server';
import { getTurso, generateId } from '@/lib/turso';

// GET - Get crew assignments
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('job_id');
    const crewMemberId = searchParams.get('crew_member_id');

    const client = getTurso();

    let sql = `
      SELECT
        ca.*,
        cm.name as crew_member_name,
        cm.role as crew_member_role,
        cm.phone as crew_member_phone,
        j.name as job_name,
        jp.name as phase_name
      FROM crew_assignments ca
      LEFT JOIN crew_members cm ON ca.crew_member_id = cm.id
      LEFT JOIN jobs j ON ca.job_id = j.id
      LEFT JOIN job_phases jp ON ca.phase_id = jp.id
      WHERE 1=1
    `;
    const args: string[] = [];

    if (jobId) {
      sql += ' AND ca.job_id = ?';
      args.push(jobId);
    }

    if (crewMemberId) {
      sql += ' AND ca.crew_member_id = ?';
      args.push(crewMemberId);
    }

    sql += ' ORDER BY ca.start_date ASC';

    const result = await client.execute({ sql, args });

    const assignments = result.rows.map((row: any) => ({
      ...row,
      scheduled_hours: row.scheduled_hours !== null ? Number(row.scheduled_hours) : null,
    }));

    return NextResponse.json({
      success: true,
      data: assignments,
    });
  } catch (error: any) {
    console.error('Error fetching crew assignments:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// POST - Create a crew assignment
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      crew_member_id,
      job_id,
      phase_id,
      start_date,
      end_date,
      scheduled_hours,
      notes,
    } = body;

    if (!crew_member_id || !job_id) {
      return NextResponse.json(
        { success: false, error: 'crew_member_id and job_id are required' },
        { status: 400 }
      );
    }

    const client = getTurso();
    const id = generateId();

    await client.execute({
      sql: `
        INSERT INTO crew_assignments (
          id, crew_member_id, job_id, phase_id, start_date, end_date,
          scheduled_hours, status, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 'scheduled', ?)
      `,
      args: [
        id,
        crew_member_id,
        job_id,
        phase_id || null,
        start_date || null,
        end_date || null,
        scheduled_hours || null,
        notes || null,
      ],
    });

    // Return with joined data
    const result = await client.execute({
      sql: `
        SELECT
          ca.*,
          cm.name as crew_member_name,
          cm.role as crew_member_role,
          j.name as job_name,
          jp.name as phase_name
        FROM crew_assignments ca
        LEFT JOIN crew_members cm ON ca.crew_member_id = cm.id
        LEFT JOIN jobs j ON ca.job_id = j.id
        LEFT JOIN job_phases jp ON ca.phase_id = jp.id
        WHERE ca.id = ?
      `,
      args: [id],
    });

    return NextResponse.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error: any) {
    console.error('Error creating crew assignment:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// PUT - Update a crew assignment
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
      'phase_id', 'start_date', 'end_date', 'scheduled_hours', 'status', 'notes'
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

    values.push(id);

    await client.execute({
      sql: `UPDATE crew_assignments SET ${fields.join(', ')} WHERE id = ?`,
      args: values,
    });

    const result = await client.execute({
      sql: `
        SELECT
          ca.*,
          cm.name as crew_member_name,
          cm.role as crew_member_role,
          j.name as job_name,
          jp.name as phase_name
        FROM crew_assignments ca
        LEFT JOIN crew_members cm ON ca.crew_member_id = cm.id
        LEFT JOIN jobs j ON ca.job_id = j.id
        LEFT JOIN job_phases jp ON ca.phase_id = jp.id
        WHERE ca.id = ?
      `,
      args: [id],
    });

    return NextResponse.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error: any) {
    console.error('Error updating crew assignment:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// DELETE - Delete a crew assignment
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
      sql: 'DELETE FROM crew_assignments WHERE id = ?',
      args: [id],
    });

    return NextResponse.json({
      success: true,
      message: 'Assignment deleted',
    });
  } catch (error: any) {
    console.error('Error deleting crew assignment:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
