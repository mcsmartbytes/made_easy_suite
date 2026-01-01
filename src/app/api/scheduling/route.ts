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
        { success: false, error: 'user_id is required' },
        { status: 400 }
      );
    }

    const client = getTurso();

    // Fetch jobs with date ranges that overlap the requested period
    const jobsResult = await client.execute({
      sql: `
        SELECT id, name, client_name, status, start_date, end_date
        FROM jobs
        WHERE user_id = ?
          AND (
            (start_date IS NOT NULL AND start_date <= ?)
            OR (end_date IS NOT NULL AND end_date >= ?)
            OR (start_date IS NULL AND end_date IS NULL AND status = 'active')
          )
        ORDER BY start_date ASC
      `,
      args: [userId, endDate || '9999-12-31', startDate || '0000-01-01'],
    });

    // Fetch crew assignments with their related data
    const crewResult = await client.execute({
      sql: `
        SELECT
          ca.id, ca.crew_member_id, ca.job_id, ca.phase_id,
          ca.start_date, ca.end_date, ca.scheduled_hours, ca.status,
          cm.name as crew_member_name,
          j.name as job_name,
          jp.name as phase_name
        FROM crew_assignments ca
        LEFT JOIN crew_members cm ON ca.crew_member_id = cm.id
        LEFT JOIN jobs j ON ca.job_id = j.id
        LEFT JOIN job_phases jp ON ca.phase_id = jp.id
        WHERE cm.user_id = ?
          AND (
            (ca.start_date IS NOT NULL AND ca.start_date <= ?)
            OR (ca.end_date IS NOT NULL AND ca.end_date >= ?)
            OR (ca.start_date IS NULL AND ca.end_date IS NULL)
          )
        ORDER BY ca.start_date ASC
      `,
      args: [userId, endDate || '9999-12-31', startDate || '0000-01-01'],
    });

    // Fetch tasks with due dates in the range
    const tasksResult = await client.execute({
      sql: `
        SELECT
          jt.id, jt.job_id, jt.title, jt.due_date,
          jt.assigned_to, jt.status, jt.priority,
          j.name as job_name
        FROM job_tasks jt
        LEFT JOIN jobs j ON jt.job_id = j.id
        WHERE j.user_id = ?
          AND jt.due_date IS NOT NULL
          AND jt.due_date >= ?
          AND jt.due_date <= ?
        ORDER BY jt.due_date ASC
      `,
      args: [userId, startDate || '0000-01-01', endDate || '9999-12-31'],
    });

    return NextResponse.json({
      success: true,
      data: {
        jobs: jobsResult.rows,
        crewAssignments: crewResult.rows,
        tasks: tasksResult.rows,
      },
    });
  } catch (error: any) {
    console.error('Error fetching scheduling data:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
