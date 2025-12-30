import { NextRequest, NextResponse } from 'next/server';
import { getTurso, generateId } from '@/lib/turso';

// POST - generate due recurring expenses
export async function POST(request: NextRequest) {
  try {
    const client = getTurso();
    const body = await request.json();
    const { user_id } = body;

    if (!user_id) {
      return NextResponse.json(
        { success: false, error: 'User ID is required' },
        { status: 400 }
      );
    }

    const today = new Date().toISOString().split('T')[0];

    // Get all active recurring expenses that are due
    const dueResult = await client.execute({
      sql: `
        SELECT * FROM recurring_expenses
        WHERE user_id = ? AND is_active = 1 AND next_due <= ?
      `,
      args: [user_id, today],
    });

    const dueExpenses = dueResult.rows;

    if (!dueExpenses || dueExpenses.length === 0) {
      return NextResponse.json({
        success: true,
        generated: 0,
        message: 'No recurring expenses due'
      });
    }

    const generatedExpenses = [];

    for (const recurring of dueExpenses) {
      const expenseId = generateId();

      // Create the expense
      await client.execute({
        sql: `
          INSERT INTO expenses (id, user_id, amount, description, category_id, vendor, is_business, notes, date)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        args: [
          expenseId,
          recurring.user_id,
          recurring.amount,
          recurring.description,
          recurring.category_id,
          recurring.vendor,
          recurring.is_business,
          recurring.notes ? `${recurring.notes} (Auto-generated from recurring)` : '(Auto-generated from recurring)',
          recurring.next_due,
        ],
      });

      generatedExpenses.push({
        id: expenseId,
        user_id: recurring.user_id,
        amount: recurring.amount,
        description: recurring.description,
        date: recurring.next_due,
      });

      // Calculate next due date
      const nextDueDate = calculateNextDueDate(
        new Date(recurring.next_due as string),
        recurring.frequency as string
      );

      // Update the recurring expense with new next_due and last_generated
      await client.execute({
        sql: `
          UPDATE recurring_expenses
          SET next_due = ?, last_generated = ?, updated_at = datetime('now')
          WHERE id = ?
        `,
        args: [nextDueDate.toISOString().split('T')[0], today, recurring.id],
      });
    }

    return NextResponse.json({
      success: true,
      generated: generatedExpenses.length,
      expenses: generatedExpenses,
    });
  } catch (error: any) {
    console.error('Error generating recurring expenses:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

function calculateNextDueDate(currentDate: Date, frequency: string): Date {
  const next = new Date(currentDate);

  switch (frequency) {
    case 'weekly':
      next.setDate(next.getDate() + 7);
      break;
    case 'biweekly':
      next.setDate(next.getDate() + 14);
      break;
    case 'monthly':
      next.setMonth(next.getMonth() + 1);
      break;
    case 'quarterly':
      next.setMonth(next.getMonth() + 3);
      break;
    case 'annually':
      next.setFullYear(next.getFullYear() + 1);
      break;
    default:
      next.setMonth(next.getMonth() + 1); // Default to monthly
  }

  return next;
}
