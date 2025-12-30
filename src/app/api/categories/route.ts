import { NextRequest, NextResponse } from 'next/server';
import { getTurso, generateId } from '@/lib/turso';

// GET - fetch all categories for a user
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');

    const client = getTurso();

    let sql = 'SELECT * FROM categories';
    const args: string[] = [];

    if (userId) {
      sql += ' WHERE user_id = ?';
      args.push(userId);
    }

    sql += ' ORDER BY name ASC';

    const result = await client.execute({ sql, args });

    return NextResponse.json({
      success: true,
      data: result.rows,
    });
  } catch (error: any) {
    console.error('Error fetching categories:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// POST - create one or more categories
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { categories, user_id } = body;

    if (!categories || !Array.isArray(categories) || categories.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Categories array is required' },
        { status: 400 }
      );
    }

    const client = getTurso();
    const createdCategories = [];

    for (const cat of categories) {
      const id = generateId();
      const finalUserId = cat.user_id || user_id || null;

      await client.execute({
        sql: `
          INSERT INTO categories (id, user_id, name, icon, color, deduction_percentage)
          VALUES (?, ?, ?, ?, ?, ?)
        `,
        args: [
          id,
          finalUserId,
          cat.name,
          cat.icon || null,
          cat.color || null,
          cat.deduction_percentage || 100,
        ],
      });

      createdCategories.push({
        id,
        user_id: finalUserId,
        name: cat.name,
        icon: cat.icon || null,
        color: cat.color || null,
        deduction_percentage: cat.deduction_percentage || 100,
      });
    }

    return NextResponse.json({
      success: true,
      data: createdCategories,
    });
  } catch (error: any) {
    console.error('Error creating categories:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// DELETE - delete a category by ID
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Category ID is required' },
        { status: 400 }
      );
    }

    const client = getTurso();

    await client.execute({
      sql: 'DELETE FROM categories WHERE id = ?',
      args: [id],
    });

    return NextResponse.json({
      success: true,
      message: 'Category deleted',
    });
  } catch (error: any) {
    console.error('Error deleting category:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// PUT - update a category
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Category ID is required' },
        { status: 400 }
      );
    }

    const client = getTurso();

    const allowedFields = ['name', 'icon', 'color', 'deduction_percentage'];
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
      sql: `UPDATE categories SET ${fields.join(', ')} WHERE id = ?`,
      args: values,
    });

    // Return the updated category
    const result = await client.execute({
      sql: 'SELECT * FROM categories WHERE id = ?',
      args: [id],
    });

    return NextResponse.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error: any) {
    console.error('Error updating category:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
