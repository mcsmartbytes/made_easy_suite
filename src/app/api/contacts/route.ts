import { NextRequest, NextResponse } from 'next/server';
import { getTurso, generateId } from '@/lib/turso';

// GET - List contacts for a user
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');
    const type = searchParams.get('type');
    const search = searchParams.get('search');

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'user_id is required' },
        { status: 400 }
      );
    }

    const client = getTurso();

    let sql = `SELECT * FROM contacts WHERE user_id = ?`;
    const args: (string | null)[] = [userId];

    if (type) {
      sql += ' AND type = ?';
      args.push(type);
    }

    if (search) {
      sql += ` AND (
        first_name LIKE ? OR
        last_name LIKE ? OR
        company LIKE ? OR
        email LIKE ? OR
        phone LIKE ?
      )`;
      const searchTerm = `%${search}%`;
      args.push(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm);
    }

    sql += ' ORDER BY last_name ASC, first_name ASC';

    const result = await client.execute({ sql, args });

    return NextResponse.json({
      success: true,
      data: result.rows,
    });
  } catch (error: any) {
    console.error('Error fetching contacts:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// POST - Create a new contact
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      user_id,
      first_name,
      last_name,
      company,
      email,
      phone,
      mobile,
      address,
      city,
      state,
      zip,
      type = 'lead',
      source,
      tags,
      notes,
    } = body;

    if (!user_id || !first_name) {
      return NextResponse.json(
        { success: false, error: 'user_id and first_name are required' },
        { status: 400 }
      );
    }

    const client = getTurso();
    const id = generateId();

    await client.execute({
      sql: `
        INSERT INTO contacts (
          id, user_id, first_name, last_name, company, email, phone, mobile,
          address, city, state, zip, type, source, tags, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      args: [
        id,
        user_id,
        first_name,
        last_name || null,
        company || null,
        email || null,
        phone || null,
        mobile || null,
        address || null,
        city || null,
        state || null,
        zip || null,
        type,
        source || null,
        tags || null,
        notes || null,
      ],
    });

    const result = await client.execute({
      sql: 'SELECT * FROM contacts WHERE id = ?',
      args: [id],
    });

    return NextResponse.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error: any) {
    console.error('Error creating contact:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// PUT - Update a contact
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
      'first_name', 'last_name', 'company', 'email', 'phone', 'mobile',
      'address', 'city', 'state', 'zip', 'type', 'source', 'tags', 'notes',
      'last_contacted',
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
      sql: `UPDATE contacts SET ${fields.join(', ')} WHERE id = ?`,
      args: values,
    });

    const result = await client.execute({
      sql: 'SELECT * FROM contacts WHERE id = ?',
      args: [id],
    });

    return NextResponse.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error: any) {
    console.error('Error updating contact:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// DELETE - Delete a contact
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
      sql: 'DELETE FROM contacts WHERE id = ?',
      args: [id],
    });

    return NextResponse.json({
      success: true,
      message: 'Contact deleted',
    });
  } catch (error: any) {
    console.error('Error deleting contact:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
