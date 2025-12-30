import { NextRequest, NextResponse } from 'next/server';
import { getTurso } from '@/lib/turso';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User ID is required' },
        { status: 400 }
      );
    }

    const client = getTurso();

    // Get total expenses summary
    const summaryResult = await client.execute({
      sql: `
        SELECT
          COALESCE(SUM(amount), 0) as total_expenses,
          COUNT(*) as expense_count
        FROM expenses
        WHERE user_id = ?
        ${startDate ? 'AND date >= ?' : ''}
        ${endDate ? 'AND date <= ?' : ''}
      `,
      args: [userId, ...(startDate ? [startDate] : []), ...(endDate ? [endDate] : [])],
    });

    // Get labor cost from time entries
    const laborResult = await client.execute({
      sql: `
        SELECT COALESCE(SUM(hours * COALESCE(hourly_rate, 0)), 0) as total_labor_cost
        FROM time_entries
        WHERE user_id = ?
        ${startDate ? 'AND date >= ?' : ''}
        ${endDate ? 'AND date <= ?' : ''}
      `,
      args: [userId, ...(startDate ? [startDate] : []), ...(endDate ? [endDate] : [])],
    });

    // Get expenses by category
    const categoryResult = await client.execute({
      sql: `
        SELECT
          COALESCE(c.id, 'uncategorized') as category_id,
          COALESCE(c.name, 'Uncategorized') as category_name,
          c.color,
          COALESCE(SUM(e.amount), 0) as amount,
          COUNT(e.id) as count
        FROM expenses e
        LEFT JOIN categories c ON e.category_id = c.id
        WHERE e.user_id = ?
        ${startDate ? 'AND e.date >= ?' : ''}
        ${endDate ? 'AND e.date <= ?' : ''}
        GROUP BY COALESCE(c.id, 'uncategorized'), COALESCE(c.name, 'Uncategorized'), c.color
        ORDER BY amount DESC
      `,
      args: [userId, ...(startDate ? [startDate] : []), ...(endDate ? [endDate] : [])],
    });

    // Get expenses by month
    const monthlyResult = await client.execute({
      sql: `
        SELECT
          strftime('%Y-%m', date) as month,
          COALESCE(SUM(amount), 0) as amount
        FROM expenses
        WHERE user_id = ?
        ${startDate ? 'AND date >= ?' : ''}
        ${endDate ? 'AND date <= ?' : ''}
        GROUP BY strftime('%Y-%m', date)
        ORDER BY month
      `,
      args: [userId, ...(startDate ? [startDate] : []), ...(endDate ? [endDate] : [])],
    });

    // Get expenses by job
    const byJobResult = await client.execute({
      sql: `
        SELECT
          COALESCE(j.id, 'unassigned') as job_id,
          COALESCE(j.name, 'Unassigned') as job_name,
          COALESCE(SUM(e.amount), 0) as amount,
          COUNT(e.id) as count
        FROM expenses e
        LEFT JOIN jobs j ON e.job_id = j.id
        WHERE e.user_id = ?
        ${startDate ? 'AND e.date >= ?' : ''}
        ${endDate ? 'AND e.date <= ?' : ''}
        GROUP BY COALESCE(j.id, 'unassigned'), COALESCE(j.name, 'Unassigned')
        ORDER BY amount DESC
        LIMIT 10
      `,
      args: [userId, ...(startDate ? [startDate] : []), ...(endDate ? [endDate] : [])],
    });

    // Get top vendors
    const vendorResult = await client.execute({
      sql: `
        SELECT
          COALESCE(vendor, 'Unknown') as vendor,
          SUM(amount) as amount,
          COUNT(*) as count
        FROM expenses
        WHERE user_id = ?
        ${startDate ? 'AND date >= ?' : ''}
        ${endDate ? 'AND date <= ?' : ''}
        GROUP BY COALESCE(vendor, 'Unknown')
        ORDER BY amount DESC
        LIMIT 10
      `,
      args: [userId, ...(startDate ? [startDate] : []), ...(endDate ? [endDate] : [])],
    });

    const summary = {
      total_expenses: Number(summaryResult.rows[0]?.total_expenses) || 0,
      total_labor_cost: Number(laborResult.rows[0]?.total_labor_cost) || 0,
    };

    const expenses_by_category = categoryResult.rows.map((row) => ({
      category_id: String(row.category_id),
      category_name: String(row.category_name),
      color: row.color ? String(row.color) : null,
      amount: Number(row.amount),
      count: Number(row.count),
    }));

    const expenses_by_month = monthlyResult.rows.map((row) => ({
      month: String(row.month),
      amount: Number(row.amount),
    }));

    const expenses_by_job = byJobResult.rows.map((row) => ({
      job_id: String(row.job_id),
      job_name: String(row.job_name),
      amount: Number(row.amount),
      count: Number(row.count),
    }));

    const top_vendors = vendorResult.rows.map((row) => ({
      vendor: String(row.vendor),
      amount: Number(row.amount),
      count: Number(row.count),
    }));

    return NextResponse.json({
      success: true,
      data: {
        summary,
        expenses_by_category,
        expenses_by_month,
        expenses_by_job,
        top_vendors,
      },
    });
  } catch (error: any) {
    console.error('Error fetching financial report:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
