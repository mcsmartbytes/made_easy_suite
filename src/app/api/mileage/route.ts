import { NextRequest, NextResponse } from 'next/server';
import { getTurso, generateId } from '@/lib/turso';

// GET - List mileage entries for a user
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'user_id is required' },
        { status: 400 }
      );
    }

    const client = getTurso();

    const result = await client.execute({
      sql: `
        SELECT m.*, j.name as job_name
        FROM mileage m
        LEFT JOIN jobs j ON m.job_id = j.id
        WHERE m.user_id = ?
        ORDER BY m.trip_date DESC
      `,
      args: [userId],
    });

    // Transform to match expected format
    const entries = result.rows.map(row => ({
      id: row.id,
      user_id: row.user_id,
      trip_date: row.trip_date,
      miles: Number(row.miles),
      purpose: row.purpose,
      start_location: row.start_location,
      end_location: row.end_location,
      is_round_trip: Boolean(row.is_round_trip),
      notes: row.notes,
      job_id: row.job_id,
      created_at: row.created_at,
      jobs: row.job_name ? { name: row.job_name } : null,
    }));

    return NextResponse.json({
      success: true,
      data: entries,
    });
  } catch (error: any) {
    console.error('Error fetching mileage:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// POST - Create a new mileage entry
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      user_id,
      trip_date,
      miles,
      purpose,
      start_location,
      end_location,
      is_round_trip,
      notes,
      job_id,
    } = body;

    if (!user_id || !trip_date || !miles || !purpose) {
      return NextResponse.json(
        { success: false, error: 'user_id, trip_date, miles, and purpose are required' },
        { status: 400 }
      );
    }

    const client = getTurso();
    const id = generateId();

    await client.execute({
      sql: `
        INSERT INTO mileage (
          id, user_id, trip_date, miles, purpose, start_location, end_location,
          is_round_trip, notes, job_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      args: [
        id,
        user_id,
        trip_date,
        miles,
        purpose,
        start_location || null,
        end_location || null,
        is_round_trip ? 1 : 0,
        notes || null,
        job_id || null,
      ],
    });

    // Return the created entry with job info
    const result = await client.execute({
      sql: `
        SELECT m.*, j.name as job_name
        FROM mileage m
        LEFT JOIN jobs j ON m.job_id = j.id
        WHERE m.id = ?
      `,
      args: [id],
    });

    const row = result.rows[0];
    const entry = {
      id: row.id,
      user_id: row.user_id,
      trip_date: row.trip_date,
      miles: Number(row.miles),
      purpose: row.purpose,
      start_location: row.start_location,
      end_location: row.end_location,
      is_round_trip: Boolean(row.is_round_trip),
      notes: row.notes,
      job_id: row.job_id,
      created_at: row.created_at,
      jobs: row.job_name ? { name: row.job_name } : null,
    };

    return NextResponse.json({
      success: true,
      data: entry,
    });
  } catch (error: any) {
    console.error('Error creating mileage entry:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// PUT - Update a mileage entry
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
      'trip_date', 'miles', 'purpose', 'start_location', 'end_location',
      'is_round_trip', 'notes', 'job_id',
    ];

    const fields: string[] = [];
    const values: (string | number | null)[] = [];

    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key)) {
        fields.push(`${key} = ?`);
        if (key === 'is_round_trip') {
          values.push(value ? 1 : 0);
        } else {
          values.push(value as string | number | null);
        }
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
      sql: `UPDATE mileage SET ${fields.join(', ')} WHERE id = ?`,
      args: values,
    });

    // Return updated entry
    const result = await client.execute({
      sql: `
        SELECT m.*, j.name as job_name
        FROM mileage m
        LEFT JOIN jobs j ON m.job_id = j.id
        WHERE m.id = ?
      `,
      args: [id],
    });

    const row = result.rows[0];
    const entry = {
      id: row.id,
      user_id: row.user_id,
      trip_date: row.trip_date,
      miles: Number(row.miles),
      purpose: row.purpose,
      start_location: row.start_location,
      end_location: row.end_location,
      is_round_trip: Boolean(row.is_round_trip),
      notes: row.notes,
      job_id: row.job_id,
      created_at: row.created_at,
      jobs: row.job_name ? { name: row.job_name } : null,
    };

    return NextResponse.json({
      success: true,
      data: entry,
    });
  } catch (error: any) {
    console.error('Error updating mileage:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// DELETE - Delete a mileage entry
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
      sql: 'DELETE FROM mileage WHERE id = ?',
      args: [id],
    });

    return NextResponse.json({
      success: true,
      message: 'Mileage entry deleted',
    });
  } catch (error: any) {
    console.error('Error deleting mileage:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
