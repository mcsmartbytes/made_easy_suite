import { NextRequest, NextResponse } from 'next/server';
import { getTurso, generateId } from '@/lib/turso';

// GET - fetch expenses for a user
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');
    const jobId = searchParams.get('job_id');
    const limit = searchParams.get('limit');
    const offset = searchParams.get('offset');

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User ID is required' },
        { status: 400 }
      );
    }

    const client = getTurso();

    let sql = `
      SELECT e.*,
             c.name as category_name, c.icon as category_icon, c.color as category_color,
             j.name as job_name
      FROM expenses e
      LEFT JOIN categories c ON e.category_id = c.id
      LEFT JOIN jobs j ON e.job_id = j.id
      WHERE e.user_id = ?
    `;
    const args: (string | number)[] = [userId];

    if (jobId) {
      sql += ' AND e.job_id = ?';
      args.push(jobId);
    }

    sql += ' ORDER BY e.date DESC, e.created_at DESC';

    if (limit) {
      sql += ' LIMIT ?';
      args.push(parseInt(limit));
    }

    if (offset) {
      sql += ' OFFSET ?';
      args.push(parseInt(offset));
    }

    const result = await client.execute({ sql, args });

    const expenses = result.rows.map(row => ({
      id: row.id,
      user_id: row.user_id,
      amount: Number(row.amount),
      description: row.description,
      date: row.date,
      vendor: row.vendor,
      is_business: Boolean(row.is_business),
      payment_method: row.payment_method,
      notes: row.notes,
      category_id: row.category_id,
      job_id: row.job_id,
      receipt_url: row.receipt_url,
      created_at: row.created_at,
      updated_at: row.updated_at,
      category: row.category_name ? {
        id: row.category_id,
        name: row.category_name,
        icon: row.category_icon,
        color: row.category_color,
      } : null,
      job_name: row.job_name,
    }));

    return NextResponse.json({ success: true, data: expenses });
  } catch (error: any) {
    console.error('Error fetching expenses:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// POST - create a new expense
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      user_id,
      amount,
      description,
      date,
      vendor,
      is_business,
      payment_method,
      notes,
      category_id,
      job_id,
      receipt_url,
    } = body;

    if (!user_id || amount === undefined || !description || !date) {
      return NextResponse.json(
        { success: false, error: 'user_id, amount, description, and date are required' },
        { status: 400 }
      );
    }

    const client = getTurso();
    const id = generateId();

    await client.execute({
      sql: `
        INSERT INTO expenses (
          id, user_id, amount, description, date, vendor, is_business,
          payment_method, notes, category_id, job_id, receipt_url
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      args: [
        id,
        user_id,
        parseFloat(amount),
        description,
        date,
        vendor || null,
        is_business !== false ? 1 : 0,
        payment_method || null,
        notes || null,
        category_id || null,
        job_id || null,
        receipt_url || null,
      ],
    });

    // Return the created expense with category info
    const result = await client.execute({
      sql: `
        SELECT e.*, c.name as category_name, c.icon as category_icon, c.color as category_color
        FROM expenses e
        LEFT JOIN categories c ON e.category_id = c.id
        WHERE e.id = ?
      `,
      args: [id],
    });

    const row = result.rows[0];
    const expense = {
      id: row.id,
      user_id: row.user_id,
      amount: Number(row.amount),
      description: row.description,
      date: row.date,
      vendor: row.vendor,
      is_business: Boolean(row.is_business),
      payment_method: row.payment_method,
      notes: row.notes,
      category_id: row.category_id,
      job_id: row.job_id,
      receipt_url: row.receipt_url,
      created_at: row.created_at,
      category: row.category_name ? {
        id: row.category_id,
        name: row.category_name,
        icon: row.category_icon,
        color: row.category_color,
      } : null,
    };

    return NextResponse.json({ success: true, data: expense });
  } catch (error: any) {
    console.error('Error creating expense:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// PUT - update an expense
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Expense ID is required' },
        { status: 400 }
      );
    }

    const client = getTurso();

    const allowedFields = [
      'amount', 'description', 'date', 'vendor', 'is_business',
      'payment_method', 'notes', 'category_id', 'job_id', 'receipt_url',
    ];

    const fields: string[] = [];
    const values: (string | number | null)[] = [];

    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key)) {
        fields.push(`${key} = ?`);
        if (key === 'is_business') {
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
      sql: `UPDATE expenses SET ${fields.join(', ')} WHERE id = ?`,
      args: values,
    });

    // Return the updated expense
    const result = await client.execute({
      sql: `
        SELECT e.*, c.name as category_name, c.icon as category_icon, c.color as category_color
        FROM expenses e
        LEFT JOIN categories c ON e.category_id = c.id
        WHERE e.id = ?
      `,
      args: [id],
    });

    const row = result.rows[0];
    const expense = {
      id: row.id,
      user_id: row.user_id,
      amount: Number(row.amount),
      description: row.description,
      date: row.date,
      vendor: row.vendor,
      is_business: Boolean(row.is_business),
      payment_method: row.payment_method,
      notes: row.notes,
      category_id: row.category_id,
      job_id: row.job_id,
      receipt_url: row.receipt_url,
      created_at: row.created_at,
      updated_at: row.updated_at,
      category: row.category_name ? {
        id: row.category_id,
        name: row.category_name,
        icon: row.category_icon,
        color: row.category_color,
      } : null,
    };

    return NextResponse.json({ success: true, data: expense });
  } catch (error: any) {
    console.error('Error updating expense:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// DELETE - delete an expense
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Expense ID is required' },
        { status: 400 }
      );
    }

    const client = getTurso();

    // Also delete associated receipts
    await client.execute({
      sql: 'DELETE FROM receipts WHERE expense_id = ?',
      args: [id],
    });

    await client.execute({
      sql: 'DELETE FROM expenses WHERE id = ?',
      args: [id],
    });

    return NextResponse.json({ success: true, message: 'Expense deleted' });
  } catch (error: any) {
    console.error('Error deleting expense:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
