import { NextRequest, NextResponse } from 'next/server';
import { getTurso, generateId } from '@/lib/turso';

// GET - Get materials for a job
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: jobId } = await params;

    const client = getTurso();

    const result = await client.execute({
      sql: `
        SELECT * FROM job_materials
        WHERE job_id = ?
        ORDER BY created_at DESC
      `,
      args: [jobId],
    });

    const materials = result.rows.map((row: any) => ({
      ...row,
      quantity: Number(row.quantity),
      unit_cost: row.unit_cost !== null ? Number(row.unit_cost) : null,
    }));

    return NextResponse.json({
      success: true,
      data: materials,
    });
  } catch (error: any) {
    console.error('Error fetching materials:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// POST - Create a material for a job
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: jobId } = await params;
    const body = await request.json();
    const { user_id, name, quantity, unit, unit_cost, vendor, notes } = body;

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
        INSERT INTO job_materials (id, job_id, user_id, name, quantity, unit, unit_cost, vendor, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      args: [
        id,
        jobId,
        user_id,
        name,
        quantity || 1,
        unit || null,
        unit_cost || null,
        vendor || null,
        notes || null,
      ],
    });

    return NextResponse.json({
      success: true,
      data: { id, job_id: jobId, user_id, name, quantity: quantity || 1 },
    });
  } catch (error: any) {
    console.error('Error creating material:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// PUT - Update a material
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, name, quantity, unit, unit_cost, vendor, notes } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Material ID is required' },
        { status: 400 }
      );
    }

    const client = getTurso();

    const fields: string[] = [];
    const values: (string | number | null)[] = [];

    if (name !== undefined) {
      fields.push('name = ?');
      values.push(name);
    }
    if (quantity !== undefined) {
      fields.push('quantity = ?');
      values.push(quantity);
    }
    if (unit !== undefined) {
      fields.push('unit = ?');
      values.push(unit || null);
    }
    if (unit_cost !== undefined) {
      fields.push('unit_cost = ?');
      values.push(unit_cost || null);
    }
    if (vendor !== undefined) {
      fields.push('vendor = ?');
      values.push(vendor || null);
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
      sql: `UPDATE job_materials SET ${fields.join(', ')} WHERE id = ?`,
      args: values,
    });

    const result = await client.execute({
      sql: 'SELECT * FROM job_materials WHERE id = ?',
      args: [id],
    });

    const material = result.rows[0] as any;
    return NextResponse.json({
      success: true,
      data: {
        ...material,
        quantity: Number(material.quantity),
        unit_cost: material.unit_cost !== null ? Number(material.unit_cost) : null,
      },
    });
  } catch (error: any) {
    console.error('Error updating material:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// DELETE - Delete a material
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
      sql: 'DELETE FROM job_materials WHERE id = ?',
      args: [id],
    });

    return NextResponse.json({
      success: true,
      message: 'Material deleted',
    });
  } catch (error: any) {
    console.error('Error deleting material:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
