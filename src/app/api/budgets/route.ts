import { NextRequest, NextResponse } from 'next/server';
import { getTurso, generateId } from '@/lib/turso';

// GET - List budgets for a user
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
        SELECT b.*, c.name as category_name, c.icon as category_icon, c.color as category_color
        FROM budgets b
        LEFT JOIN categories c ON b.category_id = c.id
        WHERE b.user_id = ?
        ORDER BY b.created_at DESC
      `,
      args: [userId],
    });

    // Transform to match expected format
    const budgets = result.rows.map(row => ({
      id: row.id,
      user_id: row.user_id,
      category_id: row.category_id,
      budget_amount: row.budget_amount,
      period: row.period,
      start_date: row.start_date,
      created_at: row.created_at,
      updated_at: row.updated_at,
      categories: row.category_name ? {
        id: row.category_id,
        name: row.category_name,
        icon: row.category_icon,
        color: row.category_color,
      } : null,
    }));

    return NextResponse.json({
      success: true,
      data: budgets,
    });
  } catch (error: any) {
    console.error('Error fetching budgets:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// POST - Create a new budget
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { user_id, category_id, budget_amount, period, start_date } = body;

    if (!user_id || !category_id || !budget_amount) {
      return NextResponse.json(
        { success: false, error: 'user_id, category_id, and budget_amount are required' },
        { status: 400 }
      );
    }

    const client = getTurso();
    const id = generateId();
    const budgetStartDate = start_date || new Date().toISOString().split('T')[0];

    await client.execute({
      sql: `
        INSERT INTO budgets (id, user_id, category_id, budget_amount, period, start_date)
        VALUES (?, ?, ?, ?, ?, ?)
      `,
      args: [id, user_id, category_id, budget_amount, period || 'monthly', budgetStartDate],
    });

    // Return the created budget with category info
    const result = await client.execute({
      sql: `
        SELECT b.*, c.name as category_name, c.icon as category_icon, c.color as category_color
        FROM budgets b
        LEFT JOIN categories c ON b.category_id = c.id
        WHERE b.id = ?
      `,
      args: [id],
    });

    const row = result.rows[0];
    const budget = {
      id: row.id,
      user_id: row.user_id,
      category_id: row.category_id,
      budget_amount: row.budget_amount,
      period: row.period,
      start_date: row.start_date,
      created_at: row.created_at,
      updated_at: row.updated_at,
      categories: row.category_name ? {
        id: row.category_id,
        name: row.category_name,
        icon: row.category_icon,
        color: row.category_color,
      } : null,
    };

    return NextResponse.json({
      success: true,
      data: budget,
    });
  } catch (error: any) {
    console.error('Error creating budget:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// PUT - Update a budget
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, category_id, budget_amount, period } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'id is required' },
        { status: 400 }
      );
    }

    const client = getTurso();

    const updates: string[] = [];
    const values: (string | number)[] = [];

    if (category_id) {
      updates.push('category_id = ?');
      values.push(category_id);
    }
    if (budget_amount !== undefined) {
      updates.push('budget_amount = ?');
      values.push(budget_amount);
    }
    if (period) {
      updates.push('period = ?');
      values.push(period);
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No fields to update' },
        { status: 400 }
      );
    }

    updates.push("updated_at = datetime('now')");
    values.push(id);

    await client.execute({
      sql: `UPDATE budgets SET ${updates.join(', ')} WHERE id = ?`,
      args: values,
    });

    // Return the updated budget
    const result = await client.execute({
      sql: `
        SELECT b.*, c.name as category_name, c.icon as category_icon, c.color as category_color
        FROM budgets b
        LEFT JOIN categories c ON b.category_id = c.id
        WHERE b.id = ?
      `,
      args: [id],
    });

    const row = result.rows[0];
    const budget = {
      id: row.id,
      user_id: row.user_id,
      category_id: row.category_id,
      budget_amount: row.budget_amount,
      period: row.period,
      start_date: row.start_date,
      created_at: row.created_at,
      updated_at: row.updated_at,
      categories: row.category_name ? {
        id: row.category_id,
        name: row.category_name,
        icon: row.category_icon,
        color: row.category_color,
      } : null,
    };

    return NextResponse.json({
      success: true,
      data: budget,
    });
  } catch (error: any) {
    console.error('Error updating budget:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// DELETE - Delete a budget
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
      sql: 'DELETE FROM budgets WHERE id = ?',
      args: [id],
    });

    return NextResponse.json({
      success: true,
      message: 'Budget deleted',
    });
  } catch (error: any) {
    console.error('Error deleting budget:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
