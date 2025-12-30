import { NextRequest, NextResponse } from 'next/server';
import { getTurso, generateId } from '@/lib/turso';

// GET - Get time entries for a job
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: jobId } = await params;

    const client = getTurso();

    const result = await client.execute({
      sql: `
        SELECT * FROM time_entries
        WHERE job_id = ?
        ORDER BY date DESC
      `,
      args: [jobId],
    });

    const entries = result.rows.map((row: any) => ({
      ...row,
      hours: Number(row.hours),
      hourly_rate: row.hourly_rate !== null ? Number(row.hourly_rate) : null,
    }));

    return NextResponse.json({
      success: true,
      data: entries,
    });
  } catch (error: any) {
    console.error('Error fetching time entries:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// POST - Create a time entry for a job
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: jobId } = await params;
    const body = await request.json();
    const { user_id, date, hours, hourly_rate, description, notes } = body;

    if (!user_id || !date || !hours) {
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
      args: [id, user_id, jobId, date, hours, hourly_rate || null, description || null, notes || null],
    });

    return NextResponse.json({
      success: true,
      data: { id, user_id, job_id: jobId, date, hours, hourly_rate, description, notes },
    });
  } catch (error: any) {
    console.error('Error creating time entry:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
