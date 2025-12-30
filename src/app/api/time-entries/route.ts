import { NextRequest, NextResponse } from 'next/server';
import { getTurso, generateId } from '@/lib/turso';

// GET - fetch all time entries for a user
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');
    const jobId = searchParams.get('job_id');

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User ID is required' },
        { status: 400 }
      );
    }

    const client = getTurso();

    let sql = `
      SELECT t.*, j.name as job_name
      FROM time_entries t
      LEFT JOIN jobs j ON t.job_id = j.id
      WHERE t.user_id = ?
    `;
    const args: (string | null)[] = [userId];

    if (jobId) {
      sql += ' AND t.job_id = ?';
      args.push(jobId);
    }

    sql += ' ORDER BY t.date DESC';

    const result = await client.execute({ sql, args });

    const entries = result.rows.map(row => ({
      id: row.id,
      user_id: row.user_id,
      job_id: row.job_id,
      date: row.date,
      hours: Number(row.hours),
      hourly_rate: row.hourly_rate !== null ? Number(row.hourly_rate) : null,
      description: row.description,
      notes: row.notes,
      created_at: row.created_at,
      jobs: row.job_name ? { name: row.job_name } : null,
    }));

    return NextResponse.json({ success: true, data: entries });
  } catch (error: any) {
    console.error('Error fetching time entries:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// POST - create a new time entry
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { user_id, job_id, date, hours, hourly_rate, description, notes } = body;

    if (!user_id || !date || hours === undefined) {
      return NextResponse.json(
        { success: false, error: 'user_id, date, and hours are required' },
        { status: 400 }
      );
    }

    const client = getTurso();
    const id = generateId();

    await client.execute({
      sql: `
        INSERT INTO time_entries (id, user_id, job_id, date, hours, hourly_rate, description, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
      args: [
        id,
        user_id,
        job_id || null,
        date,
        hours,
        hourly_rate || null,
        description || null,
        notes || null,
      ],
    });

    // Return the created entry with job info
    const result = await client.execute({
      sql: `
        SELECT t.*, j.name as job_name
        FROM time_entries t
        LEFT JOIN jobs j ON t.job_id = j.id
        WHERE t.id = ?
      `,
      args: [id],
    });

    const row = result.rows[0];
    const entry = {
      id: row.id,
      user_id: row.user_id,
      job_id: row.job_id,
      date: row.date,
      hours: Number(row.hours),
      hourly_rate: row.hourly_rate !== null ? Number(row.hourly_rate) : null,
      description: row.description,
      notes: row.notes,
      created_at: row.created_at,
      jobs: row.job_name ? { name: row.job_name } : null,
    };

    return NextResponse.json({ success: true, data: entry });
  } catch (error: any) {
    console.error('Error creating time entry:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// PUT - update a time entry
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Time entry ID is required' },
        { status: 400 }
      );
    }

    const client = getTurso();

    const allowedFields = ['job_id', 'date', 'hours', 'hourly_rate', 'description', 'notes'];
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
      sql: `UPDATE time_entries SET ${fields.join(', ')} WHERE id = ?`,
      args: values,
    });

    // Return the updated entry
    const result = await client.execute({
      sql: `
        SELECT t.*, j.name as job_name
        FROM time_entries t
        LEFT JOIN jobs j ON t.job_id = j.id
        WHERE t.id = ?
      `,
      args: [id],
    });

    const row = result.rows[0];
    const entry = {
      id: row.id,
      user_id: row.user_id,
      job_id: row.job_id,
      date: row.date,
      hours: Number(row.hours),
      hourly_rate: row.hourly_rate !== null ? Number(row.hourly_rate) : null,
      description: row.description,
      notes: row.notes,
      created_at: row.created_at,
      jobs: row.job_name ? { name: row.job_name } : null,
    };

    return NextResponse.json({ success: true, data: entry });
  } catch (error: any) {
    console.error('Error updating time entry:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// DELETE - delete a time entry
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Time entry ID is required' },
        { status: 400 }
      );
    }

    const client = getTurso();

    await client.execute({
      sql: 'DELETE FROM time_entries WHERE id = ?',
      args: [id],
    });

    return NextResponse.json({ success: true, message: 'Time entry deleted' });
  } catch (error: any) {
    console.error('Error deleting time entry:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
