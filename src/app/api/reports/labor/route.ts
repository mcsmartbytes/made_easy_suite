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
          COALESCE(SUM(hours), 0) as total_hours,
          COALESCE(SUM(hours * hourly_rate), 0) as total_cost,
          CASE WHEN SUM(hours) > 0 THEN SUM(hours * hourly_rate) / SUM(hours) ELSE 0 END as avg_rate,
          COUNT(DISTINCT job_id) as jobs_with_time
        FROM time_entries
        WHERE user_id = ?
        ${startDate ? 'AND date >= ?' : ''}
        ${endDate ? 'AND date <= ?' : ''}
      `,
      args: [userId, ...(startDate ? [startDate] : []), ...(endDate ? [endDate] : [])],
    });

    // Get hours by job
    const byJobResult = await client.execute({
      sql: `
        SELECT
          t.job_id,
          COALESCE(j.name, 'No Job') as job_name,
          SUM(t.hours) as hours,
          SUM(t.hours * t.hourly_rate) as cost
        FROM time_entries t
        LEFT JOIN jobs j ON t.job_id = j.id
        WHERE t.user_id = ?
        ${startDate ? 'AND t.date >= ?' : ''}
        ${endDate ? 'AND t.date <= ?' : ''}
        GROUP BY t.job_id, j.name
        ORDER BY hours DESC
        LIMIT 15
      `,
      args: [userId, ...(startDate ? [startDate] : []), ...(endDate ? [endDate] : [])],
    });

    // Get hours by month
    const monthlyResult = await client.execute({
      sql: `
        SELECT
          strftime('%Y-%m', date) as month,
          SUM(hours) as hours,
          SUM(hours * hourly_rate) as cost
        FROM time_entries
        WHERE user_id = ?
        ${startDate ? 'AND date >= ?' : ''}
        ${endDate ? 'AND date <= ?' : ''}
        GROUP BY strftime('%Y-%m', date)
        ORDER BY month
      `,
      args: [userId, ...(startDate ? [startDate] : []), ...(endDate ? [endDate] : [])],
    });

    const summary = {
      total_hours: Number(summaryResult.rows[0]?.total_hours) || 0,
      total_labor_cost: Number(summaryResult.rows[0]?.total_cost) || 0,
      avg_hourly_rate: Number(summaryResult.rows[0]?.avg_rate) || 0,
      jobs_with_time: Number(summaryResult.rows[0]?.jobs_with_time) || 0,
    };

    const hours_by_job = byJobResult.rows.map((row) => ({
      job_id: row.job_id ? String(row.job_id) : '',
      job_name: String(row.job_name),
      hours: Number(row.hours),
      cost: Number(row.cost),
    }));

    const hours_by_month = monthlyResult.rows.map((row) => ({
      month: String(row.month),
      hours: Number(row.hours),
      cost: Number(row.cost),
    }));

    return NextResponse.json({
      success: true,
      data: {
        summary,
        hours_by_job,
        hours_by_month,
      },
    });
  } catch (error: any) {
    console.error('Error fetching labor report:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
