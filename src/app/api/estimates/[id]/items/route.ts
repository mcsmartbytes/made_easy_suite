import { NextRequest, NextResponse } from 'next/server';
import { getTurso, generateId } from '@/lib/turso';

// GET - Get items for an estimate
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: estimateId } = await params;

    const client = getTurso();

    const result = await client.execute({
      sql: `
        SELECT * FROM estimate_items
        WHERE estimate_id = ?
        ORDER BY sort_order ASC
      `,
      args: [estimateId],
    });

    const items = result.rows.map((row: any) => ({
      ...row,
      quantity: Number(row.quantity),
      unit_price: Number(row.unit_price),
      total: Number(row.total),
    }));

    return NextResponse.json({
      success: true,
      data: items,
    });
  } catch (error: any) {
    console.error('Error fetching estimate items:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// POST - Create items for an estimate (bulk)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: estimateId } = await params;
    const body = await request.json();
    const { items } = body;

    if (!items || !Array.isArray(items)) {
      return NextResponse.json(
        { success: false, error: 'items array is required' },
        { status: 400 }
      );
    }

    const client = getTurso();
    const createdItems = [];

    for (const item of items) {
      const id = generateId();
      const quantity = item.quantity || 1;
      const unitPrice = item.unit_price || 0;
      const total = quantity * unitPrice;

      await client.execute({
        sql: `
          INSERT INTO estimate_items (id, estimate_id, description, quantity, unit, unit_price, total, sort_order, is_optional)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        args: [
          id,
          estimateId,
          item.description || '',
          quantity,
          item.unit || null,
          unitPrice,
          total,
          item.sort_order || 0,
          item.is_optional ? 1 : 0,
        ],
      });

      createdItems.push({
        id,
        estimate_id: estimateId,
        description: item.description,
        quantity,
        unit: item.unit,
        unit_price: unitPrice,
        total,
        sort_order: item.sort_order || 0,
        is_optional: item.is_optional || false,
      });
    }

    return NextResponse.json({
      success: true,
      data: createdItems,
    });
  } catch (error: any) {
    console.error('Error creating estimate items:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// PUT - Update an estimate item
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, description, quantity, unit, unit_price, sort_order, is_optional } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Item ID is required' },
        { status: 400 }
      );
    }

    const client = getTurso();

    const fields: string[] = [];
    const values: (string | number | null)[] = [];

    if (description !== undefined) {
      fields.push('description = ?');
      values.push(description);
    }
    if (quantity !== undefined) {
      fields.push('quantity = ?');
      values.push(quantity);
    }
    if (unit !== undefined) {
      fields.push('unit = ?');
      values.push(unit || null);
    }
    if (unit_price !== undefined) {
      fields.push('unit_price = ?');
      values.push(unit_price);
    }
    if (sort_order !== undefined) {
      fields.push('sort_order = ?');
      values.push(sort_order);
    }
    if (is_optional !== undefined) {
      fields.push('is_optional = ?');
      values.push(is_optional ? 1 : 0);
    }

    // Recalculate total if quantity or unit_price changed
    if (quantity !== undefined || unit_price !== undefined) {
      const currentResult = await client.execute({
        sql: 'SELECT quantity, unit_price FROM estimate_items WHERE id = ?',
        args: [id],
      });
      if (currentResult.rows.length > 0) {
        const current = currentResult.rows[0] as any;
        const newQty = quantity !== undefined ? quantity : Number(current.quantity);
        const newPrice = unit_price !== undefined ? unit_price : Number(current.unit_price);
        fields.push('total = ?');
        values.push(newQty * newPrice);
      }
    }

    if (fields.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No fields to update' },
        { status: 400 }
      );
    }

    values.push(id);

    await client.execute({
      sql: `UPDATE estimate_items SET ${fields.join(', ')} WHERE id = ?`,
      args: values,
    });

    const result = await client.execute({
      sql: 'SELECT * FROM estimate_items WHERE id = ?',
      args: [id],
    });

    const item = result.rows[0] as any;
    return NextResponse.json({
      success: true,
      data: {
        ...item,
        quantity: Number(item.quantity),
        unit_price: Number(item.unit_price),
        total: Number(item.total),
      },
    });
  } catch (error: any) {
    console.error('Error updating estimate item:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// DELETE - Delete an estimate item
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Item ID is required' },
        { status: 400 }
      );
    }

    const client = getTurso();

    await client.execute({
      sql: 'DELETE FROM estimate_items WHERE id = ?',
      args: [id],
    });

    return NextResponse.json({
      success: true,
      message: 'Item deleted',
    });
  } catch (error: any) {
    console.error('Error deleting estimate item:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
