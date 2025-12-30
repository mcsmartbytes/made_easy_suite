import { NextRequest, NextResponse } from 'next/server';
import { getTurso, generateId } from '@/lib/turso';

// GET - fetch all recurring expenses for a user
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User ID is required' },
        { status: 400 }
      );
    }

    const client = getTurso();

    const result = await client.execute({
      sql: `
        SELECT r.*, c.name as category_name, c.icon as category_icon, c.color as category_color
        FROM recurring_expenses r
        LEFT JOIN categories c ON r.category_id = c.id
        WHERE r.user_id = ?
        ORDER BY r.next_due ASC
      `,
      args: [userId],
    });

    // Transform to match expected format
    const expenses = result.rows.map(row => ({
      id: row.id,
      user_id: row.user_id,
      description: row.description,
      amount: Number(row.amount),
      frequency: row.frequency,
      start_date: row.start_date,
      next_due_date: row.next_due,
      vendor: row.vendor,
      payment_method: row.payment_method,
      is_business: Boolean(row.is_business),
      is_active: Boolean(row.is_active),
      notes: row.notes,
      category_id: row.category_id,
      created_at: row.created_at,
      updated_at: row.updated_at,
      categories: row.category_name ? {
        id: row.category_id,
        name: row.category_name,
        icon: row.category_icon,
        color: row.category_color,
      } : null,
    }));

    return NextResponse.json({ success: true, data: expenses });
  } catch (error: any) {
    console.error('Error fetching recurring expenses:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// POST - create a new recurring expense
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      user_id,
      amount,
      description,
      category_id,
      vendor,
      payment_method,
      is_business,
      notes,
      frequency,
      start_date,
    } = body;

    if (!user_id || !amount || !description || !frequency || !start_date) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const client = getTurso();
    const id = generateId();

    // Calculate next due date based on start date
    const nextDueDate = start_date;

    await client.execute({
      sql: `
        INSERT INTO recurring_expenses (
          id, user_id, description, amount, frequency, start_date, next_due,
          vendor, payment_method, is_business, is_active, notes, category_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      args: [
        id,
        user_id,
        description,
        parseFloat(amount),
        frequency,
        start_date,
        nextDueDate,
        vendor || null,
        payment_method || 'credit',
        is_business !== false ? 1 : 0,
        1, // is_active defaults to true
        notes || null,
        category_id || null,
      ],
    });

    // Return the created expense with category info
    const result = await client.execute({
      sql: `
        SELECT r.*, c.name as category_name, c.icon as category_icon, c.color as category_color
        FROM recurring_expenses r
        LEFT JOIN categories c ON r.category_id = c.id
        WHERE r.id = ?
      `,
      args: [id],
    });

    const row = result.rows[0];
    const expense = {
      id: row.id,
      user_id: row.user_id,
      description: row.description,
      amount: Number(row.amount),
      frequency: row.frequency,
      start_date: row.start_date,
      next_due_date: row.next_due,
      vendor: row.vendor,
      payment_method: row.payment_method,
      is_business: Boolean(row.is_business),
      is_active: Boolean(row.is_active),
      notes: row.notes,
      category_id: row.category_id,
      created_at: row.created_at,
      categories: row.category_name ? {
        id: row.category_id,
        name: row.category_name,
        icon: row.category_icon,
        color: row.category_color,
      } : null,
    };

    return NextResponse.json({ success: true, data: expense });
  } catch (error: any) {
    console.error('Error creating recurring expense:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// PUT - update a recurring expense
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Recurring expense ID is required' },
        { status: 400 }
      );
    }

    const client = getTurso();

    const allowedFields = [
      'description', 'amount', 'frequency', 'start_date', 'next_due',
      'vendor', 'payment_method', 'is_business', 'is_active', 'notes', 'category_id',
    ];

    const fields: string[] = [];
    const values: (string | number | null)[] = [];

    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key)) {
        fields.push(`${key} = ?`);
        if (key === 'is_business' || key === 'is_active') {
          values.push(value ? 1 : 0);
        } else if (key === 'amount') {
          values.push(parseFloat(value as string));
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
      sql: `UPDATE recurring_expenses SET ${fields.join(', ')} WHERE id = ?`,
      args: values,
    });

    // Return the updated expense with category info
    const result = await client.execute({
      sql: `
        SELECT r.*, c.name as category_name, c.icon as category_icon, c.color as category_color
        FROM recurring_expenses r
        LEFT JOIN categories c ON r.category_id = c.id
        WHERE r.id = ?
      `,
      args: [id],
    });

    const row = result.rows[0];
    const expense = {
      id: row.id,
      user_id: row.user_id,
      description: row.description,
      amount: Number(row.amount),
      frequency: row.frequency,
      start_date: row.start_date,
      next_due_date: row.next_due,
      vendor: row.vendor,
      payment_method: row.payment_method,
      is_business: Boolean(row.is_business),
      is_active: Boolean(row.is_active),
      notes: row.notes,
      category_id: row.category_id,
      created_at: row.created_at,
      updated_at: row.updated_at,
      categories: row.category_name ? {
        id: row.category_id,
        name: row.category_name,
        icon: row.category_icon,
        color: row.category_color,
      } : null,
    };

    return NextResponse.json({ success: true, data: expense });
  } catch (error: any) {
    console.error('Error updating recurring expense:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// DELETE - delete a recurring expense
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Recurring expense ID is required' },
        { status: 400 }
      );
    }

    const client = getTurso();

    await client.execute({
      sql: 'DELETE FROM recurring_expenses WHERE id = ?',
      args: [id],
    });

    return NextResponse.json({ success: true, message: 'Recurring expense deleted' });
  } catch (error: any) {
    console.error('Error deleting recurring expense:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
