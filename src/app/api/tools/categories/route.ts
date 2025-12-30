import { NextRequest, NextResponse } from 'next/server';
import { query, execute, generateId } from '@/lib/turso';

// GET - fetch all tool categories
export async function GET() {
  try {
    const data = await query(
      'SELECT * FROM tool_categories ORDER BY name ASC'
    );

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('Error fetching tool categories:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// POST - create a new category
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description, icon, color } = body;

    if (!name) {
      return NextResponse.json(
        { success: false, error: 'Category name is required' },
        { status: 400 }
      );
    }

    const id = generateId();
    const now = new Date().toISOString();

    await execute(
      `INSERT INTO tool_categories (id, name, description, icon, color, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, name, description || null, icon || null, color || null, now]
    );

    const rows = await query('SELECT * FROM tool_categories WHERE id = ?', [id]);

    return NextResponse.json({ success: true, data: rows[0] });
  } catch (error: any) {
    console.error('Error creating tool category:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
