import { NextRequest, NextResponse } from 'next/server';
import { getTurso } from '@/lib/turso';

// GET - Get spending totals for budget tracking
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');
    const categoryId = searchParams.get('category_id');
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'user_id is required' },
        { status: 400 }
      );
    }

    const client = getTurso();

    let sql = `
      SELECT category_id, SUM(amount) as total
      FROM expenses
      WHERE user_id = ?
    `;
    const args: (string | null)[] = [userId];

    if (categoryId) {
      sql += ' AND category_id = ?';
      args.push(categoryId);
    }

    if (startDate) {
      sql += ' AND date >= ?';
      args.push(startDate);
    }

    if (endDate) {
      sql += ' AND date <= ?';
      args.push(endDate);
    }

    sql += ' GROUP BY category_id';

    const result = await client.execute({ sql, args });

    // Transform to a map of category_id -> total
    const totals: Record<string, number> = {};
    for (const row of result.rows) {
      if (row.category_id) {
        totals[row.category_id as string] = Number(row.total) || 0;
      }
    }

    return NextResponse.json({
      success: true,
      data: totals,
    });
  } catch (error: any) {
    console.error('Error fetching spending totals:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
