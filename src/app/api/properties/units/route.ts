import { NextRequest, NextResponse } from 'next/server';
import { getTurso, generateId } from '@/lib/turso';

// GET - Fetch units for a property or user
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');
    const propertyId = searchParams.get('property_id');
    const status = searchParams.get('status');
    const unitId = searchParams.get('id');

    const client = getTurso();

    if (unitId) {
      const result = await client.execute({
        sql: `
          SELECT u.*, j.name as property_name, t.first_name, t.last_name
          FROM units u
          LEFT JOIN jobs j ON u.property_id = j.id
          LEFT JOIN tenants t ON u.current_tenant_id = t.id
          WHERE u.id = ?
        `,
        args: [unitId],
      });

      if (result.rows.length === 0) {
        return NextResponse.json({ success: false, error: 'Unit not found' }, { status: 404 });
      }

      const unit = result.rows[0] as any;
      return NextResponse.json({
        success: true,
        data: {
          ...unit,
          square_footage: Number(unit.square_footage || 0),
          market_rent: Number(unit.market_rent || 0),
          current_rent: Number(unit.current_rent || 0),
          tenant_name: unit.first_name ? `${unit.first_name} ${unit.last_name || ''}`.trim() : null,
        },
      });
    }

    if (!userId) {
      return NextResponse.json({ success: false, error: 'User ID is required' }, { status: 400 });
    }

    let sql = `
      SELECT u.*, j.name as property_name, t.first_name, t.last_name
      FROM units u
      LEFT JOIN jobs j ON u.property_id = j.id
      LEFT JOIN tenants t ON u.current_tenant_id = t.id
      WHERE u.user_id = ?
    `;
    const args: (string | number)[] = [userId];

    if (propertyId) {
      sql += ' AND u.property_id = ?';
      args.push(propertyId);
    }
    if (status) {
      sql += ' AND u.status = ?';
      args.push(status);
    }

    sql += ' ORDER BY j.name ASC, u.unit_number ASC';

    const result = await client.execute({ sql, args });

    const units = result.rows.map((row: any) => ({
      ...row,
      square_footage: Number(row.square_footage || 0),
      market_rent: Number(row.market_rent || 0),
      current_rent: Number(row.current_rent || 0),
      tenant_name: row.first_name ? `${row.first_name} ${row.last_name || ''}`.trim() : null,
    }));

    return NextResponse.json({ success: true, data: units });
  } catch (error: any) {
    console.error('Error fetching units:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST - Create a unit
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      user_id, property_id, unit_number, unit_type, floor,
      square_footage, bedrooms, bathrooms, status,
      market_rent, current_rent, notes,
    } = body;

    if (!user_id || !property_id || !unit_number) {
      return NextResponse.json(
        { success: false, error: 'user_id, property_id, and unit_number are required' },
        { status: 400 }
      );
    }

    const client = getTurso();
    const id = generateId();

    await client.execute({
      sql: `
        INSERT INTO units (id, user_id, property_id, unit_number, unit_type, floor, square_footage, bedrooms, bathrooms, status, market_rent, current_rent, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      args: [
        id, user_id, property_id, unit_number, unit_type || null, floor || null,
        square_footage || null, bedrooms || null, bathrooms || null,
        status || 'vacant', market_rent || null, current_rent || null, notes || null,
      ],
    });

    const result = await client.execute({ sql: 'SELECT * FROM units WHERE id = ?', args: [id] });
    return NextResponse.json({ success: true, data: result.rows[0] });
  } catch (error: any) {
    console.error('Error creating unit:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// PUT - Update a unit
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Unit ID is required' }, { status: 400 });
    }

    const client = getTurso();
    const allowedFields = ['unit_number', 'unit_type', 'floor', 'square_footage', 'bedrooms', 'bathrooms', 'status', 'current_tenant_id', 'current_lease_id', 'market_rent', 'current_rent', 'notes'];

    const fields: string[] = [];
    const values: (string | number | null)[] = [];

    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key)) {
        fields.push(`${key} = ?`);
        values.push(value as string | number | null);
      }
    }

    if (fields.length === 0) {
      return NextResponse.json({ success: false, error: 'No valid fields to update' }, { status: 400 });
    }

    values.push(id);
    await client.execute({ sql: `UPDATE units SET ${fields.join(', ')} WHERE id = ?`, args: values });

    const result = await client.execute({ sql: 'SELECT * FROM units WHERE id = ?', args: [id] });
    return NextResponse.json({ success: true, data: result.rows[0] });
  } catch (error: any) {
    console.error('Error updating unit:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// DELETE - Delete a unit
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'Unit ID is required' }, { status: 400 });
    }

    const client = getTurso();
    await client.execute({ sql: 'DELETE FROM units WHERE id = ?', args: [id] });

    return NextResponse.json({ success: true, message: 'Unit deleted' });
  } catch (error: any) {
    console.error('Error deleting unit:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
