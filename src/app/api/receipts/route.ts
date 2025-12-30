import { NextRequest, NextResponse } from 'next/server';
import { getTurso, generateId } from '@/lib/turso';

// GET - fetch all receipts for a user
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

    // Get receipts with expense info
    const receiptResult = await client.execute({
      sql: `
        SELECT r.*,
               e.id as expense_id, e.description, e.amount, e.date, e.vendor,
               c.name as category_name
        FROM receipts r
        LEFT JOIN expenses e ON r.expense_id = e.id
        LEFT JOIN categories c ON e.category_id = c.id
        WHERE r.user_id = ?
        ORDER BY r.created_at DESC
      `,
      args: [userId],
    });

    // Also get expenses that have receipt_url directly
    const expenseResult = await client.execute({
      sql: `
        SELECT e.id, e.description, e.amount, e.date, e.vendor, e.receipt_url,
               c.name as category_name
        FROM expenses e
        LEFT JOIN categories c ON e.category_id = c.id
        WHERE e.user_id = ? AND e.receipt_url IS NOT NULL
        ORDER BY e.date DESC
      `,
      args: [userId],
    });

    // Transform receipts
    const receipts = receiptResult.rows.map(row => ({
      id: row.id,
      expense_id: row.expense_id,
      file_url: row.file_url,
      file_name: row.file_name,
      created_at: row.created_at,
      expenses: row.expense_id ? {
        id: row.expense_id,
        description: row.description,
        amount: Number(row.amount),
        date: row.date,
        vendor: row.vendor,
        categories: row.category_name ? { name: row.category_name } : null,
      } : null,
    }));

    // Transform expenses with receipts
    const expensesWithReceipts = expenseResult.rows.map(row => ({
      id: row.id,
      description: row.description,
      amount: Number(row.amount),
      date: row.date,
      vendor: row.vendor,
      receipt_url: row.receipt_url,
      categories: row.category_name ? { name: row.category_name } : null,
    }));

    return NextResponse.json({
      success: true,
      data: {
        receipts,
        expensesWithReceipts,
      },
    });
  } catch (error: any) {
    console.error('Error fetching receipts:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// POST - upload a new receipt
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { expense_id, file_url, file_name } = body;

    if (!expense_id || !file_url) {
      return NextResponse.json(
        { success: false, error: 'expense_id and file_url are required' },
        { status: 400 }
      );
    }

    const client = getTurso();
    const id = generateId();

    await client.execute({
      sql: `
        INSERT INTO receipts (id, expense_id, file_url, file_name)
        VALUES (?, ?, ?, ?)
      `,
      args: [id, expense_id, file_url, file_name || null],
    });

    const result = await client.execute({
      sql: 'SELECT * FROM receipts WHERE id = ?',
      args: [id],
    });

    return NextResponse.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error: any) {
    console.error('Error creating receipt:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// DELETE - delete a receipt
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Receipt ID is required' },
        { status: 400 }
      );
    }

    const client = getTurso();

    await client.execute({
      sql: 'DELETE FROM receipts WHERE id = ?',
      args: [id],
    });

    return NextResponse.json({
      success: true,
      message: 'Receipt deleted',
    });
  } catch (error: any) {
    console.error('Error deleting receipt:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
