import { NextRequest, NextResponse } from 'next/server';
import { getTurso } from '@/lib/turso';

// GET - Get expenses for a job
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: jobId } = await params;

    const client = getTurso();

    const result = await client.execute({
      sql: `
        SELECT e.*, c.name as category_name, c.icon as category_icon, c.color as category_color
        FROM expenses e
        LEFT JOIN categories c ON e.category_id = c.id
        WHERE e.job_id = ?
        ORDER BY e.date DESC
      `,
      args: [jobId],
    });

    const expenses = result.rows.map((row: any) => ({
      ...row,
      amount: Number(row.amount),
      is_business: Boolean(row.is_business),
    }));

    return NextResponse.json({
      success: true,
      data: expenses,
    });
  } catch (error: any) {
    console.error('Error fetching job expenses:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
