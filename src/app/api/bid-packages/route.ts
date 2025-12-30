import { NextRequest, NextResponse } from 'next/server';
import { getTurso, generateId } from '@/lib/turso';

// GET - Fetch bid packages for a job or user
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');
    const jobId = searchParams.get('job_id');
    const status = searchParams.get('status');

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User ID is required' },
        { status: 400 }
      );
    }

    const client = getTurso();

    let sql = `
      SELECT bp.*,
             j.name as job_name,
             s.company_name as awarded_to_name,
             (SELECT COUNT(*) FROM bid_package_invites WHERE bid_package_id = bp.id) as invite_count,
             (SELECT COUNT(*) FROM subcontractor_bids WHERE bid_package_id = bp.id) as bid_count
      FROM bid_packages bp
      LEFT JOIN jobs j ON bp.job_id = j.id
      LEFT JOIN subcontractors s ON bp.awarded_to = s.id
      WHERE bp.user_id = ?
    `;
    const args: (string | number)[] = [userId];

    if (jobId) {
      sql += ' AND bp.job_id = ?';
      args.push(jobId);
    }

    if (status) {
      sql += ' AND bp.status = ?';
      args.push(status);
    }

    sql += ' ORDER BY bp.created_at DESC';

    const result = await client.execute({ sql, args });

    const packages = result.rows.map((row: any) => ({
      ...row,
      budget_estimate: row.budget_estimate ? Number(row.budget_estimate) : null,
      awarded_amount: row.awarded_amount ? Number(row.awarded_amount) : null,
      invite_count: Number(row.invite_count || 0),
      bid_count: Number(row.bid_count || 0),
      attachments: row.attachments ? JSON.parse(row.attachments) : [],
    }));

    return NextResponse.json({ success: true, data: packages });
  } catch (error: any) {
    console.error('Error fetching bid packages:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// POST - Create a new bid package
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      user_id,
      job_id,
      name,
      package_number,
      csi_division,
      description,
      scope_of_work,
      inclusions,
      exclusions,
      bid_due_date,
      work_start_date,
      work_end_date,
      budget_estimate,
      attachments,
      notes,
    } = body;

    if (!user_id || !job_id || !name) {
      return NextResponse.json(
        { success: false, error: 'user_id, job_id, and name are required' },
        { status: 400 }
      );
    }

    const client = getTurso();
    const id = generateId();

    // Generate package number if not provided
    let pkgNumber = package_number;
    if (!pkgNumber) {
      const countResult = await client.execute({
        sql: 'SELECT COUNT(*) as count FROM bid_packages WHERE job_id = ?',
        args: [job_id],
      });
      const count = Number((countResult.rows[0] as any)?.count || 0) + 1;
      pkgNumber = `BP-${String(count).padStart(3, '0')}`;
    }

    await client.execute({
      sql: `
        INSERT INTO bid_packages (
          id, user_id, job_id, name, package_number, csi_division,
          description, scope_of_work, inclusions, exclusions,
          bid_due_date, work_start_date, work_end_date,
          budget_estimate, attachments, notes, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft')
      `,
      args: [
        id,
        user_id,
        job_id,
        name,
        pkgNumber,
        csi_division || null,
        description || null,
        scope_of_work || null,
        inclusions || null,
        exclusions || null,
        bid_due_date || null,
        work_start_date || null,
        work_end_date || null,
        budget_estimate || null,
        attachments ? JSON.stringify(attachments) : null,
        notes || null,
      ],
    });

    const result = await client.execute({
      sql: 'SELECT * FROM bid_packages WHERE id = ?',
      args: [id],
    });

    return NextResponse.json({ success: true, data: result.rows[0] });
  } catch (error: any) {
    console.error('Error creating bid package:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// PUT - Update a bid package
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Bid package ID is required' },
        { status: 400 }
      );
    }

    const client = getTurso();

    const allowedFields = [
      'name', 'package_number', 'csi_division',
      'description', 'scope_of_work', 'inclusions', 'exclusions',
      'bid_due_date', 'work_start_date', 'work_end_date',
      'budget_estimate', 'status', 'awarded_to', 'awarded_amount', 'awarded_at',
      'attachments', 'notes',
    ];

    const fields: string[] = [];
    const values: (string | number | null)[] = [];

    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key)) {
        fields.push(`${key} = ?`);
        if (key === 'attachments' && Array.isArray(value)) {
          values.push(JSON.stringify(value));
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
      sql: `UPDATE bid_packages SET ${fields.join(', ')} WHERE id = ?`,
      args: values,
    });

    const result = await client.execute({
      sql: 'SELECT * FROM bid_packages WHERE id = ?',
      args: [id],
    });

    return NextResponse.json({ success: true, data: result.rows[0] });
  } catch (error: any) {
    console.error('Error updating bid package:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// DELETE - Delete a bid package
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Bid package ID is required' },
        { status: 400 }
      );
    }

    const client = getTurso();

    // Delete related records
    await client.execute({
      sql: 'DELETE FROM bid_rfis WHERE bid_package_id = ?',
      args: [id],
    });
    await client.execute({
      sql: 'DELETE FROM subcontractor_bids WHERE bid_package_id = ?',
      args: [id],
    });
    await client.execute({
      sql: 'DELETE FROM bid_package_invites WHERE bid_package_id = ?',
      args: [id],
    });
    await client.execute({
      sql: 'DELETE FROM bid_packages WHERE id = ?',
      args: [id],
    });

    return NextResponse.json({ success: true, message: 'Bid package deleted' });
  } catch (error: any) {
    console.error('Error deleting bid package:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
