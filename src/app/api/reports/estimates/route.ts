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

    // Get summary stats
    const summaryResult = await client.execute({
      sql: `
        SELECT
          COUNT(*) as total_estimates,
          COALESCE(SUM(total), 0) as total_value,
          COALESCE(AVG(total), 0) as avg_value
        FROM estimates
        WHERE user_id = ?
        ${startDate ? 'AND created_at >= ?' : ''}
        ${endDate ? 'AND created_at <= ?' : ''}
      `,
      args: [userId, ...(startDate ? [startDate] : []), ...(endDate ? [endDate] : [])],
    });

    // Get win rate (accepted vs decided)
    const winRateResult = await client.execute({
      sql: `
        SELECT
          COUNT(CASE WHEN status = 'accepted' THEN 1 END) as accepted,
          COUNT(CASE WHEN status IN ('accepted', 'rejected', 'declined') THEN 1 END) as decided
        FROM estimates
        WHERE user_id = ?
        ${startDate ? 'AND created_at >= ?' : ''}
        ${endDate ? 'AND created_at <= ?' : ''}
      `,
      args: [userId, ...(startDate ? [startDate] : []), ...(endDate ? [endDate] : [])],
    });

    // Get status breakdown
    const statusResult = await client.execute({
      sql: `
        SELECT
          status,
          COUNT(*) as count,
          COALESCE(SUM(total), 0) as value
        FROM estimates
        WHERE user_id = ?
        ${startDate ? 'AND created_at >= ?' : ''}
        ${endDate ? 'AND created_at <= ?' : ''}
        GROUP BY status
        ORDER BY count DESC
      `,
      args: [userId, ...(startDate ? [startDate] : []), ...(endDate ? [endDate] : [])],
    });

    // Get monthly breakdown
    const monthlyResult = await client.execute({
      sql: `
        SELECT
          strftime('%Y-%m', created_at) as month,
          COUNT(*) as created_count,
          COUNT(CASE WHEN status = 'accepted' THEN 1 END) as accepted_count,
          COALESCE(SUM(total), 0) as total_value
        FROM estimates
        WHERE user_id = ?
        ${startDate ? 'AND created_at >= ?' : ''}
        ${endDate ? 'AND created_at <= ?' : ''}
        GROUP BY strftime('%Y-%m', created_at)
        ORDER BY month
      `,
      args: [userId, ...(startDate ? [startDate] : []), ...(endDate ? [endDate] : [])],
    });

    // Get recent estimates
    const recentResult = await client.execute({
      sql: `
        SELECT
          e.id,
          COALESCE(j.name, 'No Job') as job_name,
          e.total,
          e.status,
          e.created_at
        FROM estimates e
        LEFT JOIN jobs j ON e.job_id = j.id
        WHERE e.user_id = ?
        ORDER BY e.created_at DESC
        LIMIT 10
      `,
      args: [userId],
    });

    const accepted = Number(winRateResult.rows[0]?.accepted) || 0;
    const decided = Number(winRateResult.rows[0]?.decided) || 0;
    const winRate = decided > 0 ? Math.round((accepted / decided) * 100) : 0;

    const summary = {
      total_estimates: Number(summaryResult.rows[0]?.total_estimates) || 0,
      total_value: Number(summaryResult.rows[0]?.total_value) || 0,
      avg_value: Number(summaryResult.rows[0]?.avg_value) || 0,
      win_rate: winRate,
    };

    const status_breakdown = statusResult.rows.map((row) => ({
      status: String(row.status),
      count: Number(row.count),
      value: Number(row.value),
    }));

    const by_month = monthlyResult.rows.map((row) => ({
      month: String(row.month),
      created_count: Number(row.created_count),
      accepted_count: Number(row.accepted_count),
      total_value: Number(row.total_value),
    }));

    const recent_estimates = recentResult.rows.map((row) => ({
      id: String(row.id),
      job_name: String(row.job_name),
      total: Number(row.total),
      status: String(row.status),
      created_at: String(row.created_at),
    }));

    return NextResponse.json({
      success: true,
      data: {
        summary,
        status_breakdown,
        by_month,
        recent_estimates,
      },
    });
  } catch (error: any) {
    console.error('Error fetching estimate report:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
