import { NextRequest, NextResponse } from 'next/server';
import { getTurso, generateId } from '@/lib/turso';
import { createCrewMemberSchema, updateCrewMemberSchema, validateRequest } from '@/lib/validations';

// GET - Get all crew members for a user
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
        SELECT * FROM crew_members
        WHERE user_id = ?
        ORDER BY name ASC
      `,
      args: [userId],
    });

    const crewMembers = result.rows.map((row: any) => ({
      ...row,
      hourly_rate: row.hourly_rate !== null ? Number(row.hourly_rate) : null,
    }));

    return NextResponse.json({
      success: true,
      data: crewMembers,
    });
  } catch (error: any) {
    console.error('Error fetching crew members:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// POST - Create a new crew member
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input
    const validation = validateRequest(createCrewMemberSchema, body);
    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error },
        { status: 400 }
      );
    }

    const {
      user_id,
      name,
      role,
      type,
      email,
      phone,
      hourly_rate,
      specialty,
      license_number,
      insurance_expiry,
      notes,
    } = validation.data;

    const client = getTurso();
    const id = generateId();

    await client.execute({
      sql: `
        INSERT INTO crew_members (
          id, user_id, name, role, type, email, phone, hourly_rate,
          specialty, license_number, insurance_expiry, notes, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')
      `,
      args: [
        id,
        user_id,
        name,
        role || null,
        type || 'employee',
        email || null,
        phone || null,
        hourly_rate || null,
        specialty || null,
        license_number || null,
        insurance_expiry || null,
        notes || null,
      ],
    });

    const result = await client.execute({
      sql: 'SELECT * FROM crew_members WHERE id = ?',
      args: [id],
    });

    return NextResponse.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error: any) {
    console.error('Error creating crew member:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// PUT - Update a crew member
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
      'name', 'role', 'type', 'email', 'phone', 'hourly_rate',
      'specialty', 'license_number', 'insurance_expiry', 'status', 'notes'
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
      sql: `UPDATE crew_members SET ${fields.join(', ')} WHERE id = ?`,
      args: values,
    });

    const result = await client.execute({
      sql: 'SELECT * FROM crew_members WHERE id = ?',
      args: [id],
    });

    return NextResponse.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error: any) {
    console.error('Error updating crew member:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// DELETE - Delete a crew member
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

    // Also delete crew assignments
    await client.execute({
      sql: 'DELETE FROM crew_assignments WHERE crew_member_id = ?',
      args: [id],
    });

    await client.execute({
      sql: 'DELETE FROM crew_members WHERE id = ?',
      args: [id],
    });

    return NextResponse.json({
      success: true,
      message: 'Crew member deleted',
    });
  } catch (error: any) {
    console.error('Error deleting crew member:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
