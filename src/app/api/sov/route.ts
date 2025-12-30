import { NextRequest, NextResponse } from 'next/server';
import { getTurso, generateId } from '@/lib/turso';

// GET - Fetch SOVs for a job or user
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');
    const jobId = searchParams.get('job_id');
    const sovId = searchParams.get('id');

    const client = getTurso();

    if (sovId) {
      // Get specific SOV with line items
      const sovResult = await client.execute({
        sql: `
          SELECT sov.*, j.name as job_name, e.po_number as estimate_po
          FROM schedule_of_values sov
          LEFT JOIN jobs j ON sov.job_id = j.id
          LEFT JOIN estimates e ON sov.estimate_id = e.id
          WHERE sov.id = ?
        `,
        args: [sovId],
      });

      if (sovResult.rows.length === 0) {
        return NextResponse.json(
          { success: false, error: 'SOV not found' },
          { status: 404 }
        );
      }

      const itemsResult = await client.execute({
        sql: `
          SELECT li.*, cc.code as cost_code, cc.name as cost_code_name
          FROM sov_line_items li
          LEFT JOIN cost_codes cc ON li.cost_code_id = cc.id
          WHERE li.sov_id = ?
          ORDER BY li.sort_order ASC
        `,
        args: [sovId],
      });

      const sov = {
        ...(sovResult.rows[0] as any),
        total_contract_amount: Number((sovResult.rows[0] as any).total_contract_amount || 0),
        version: Number((sovResult.rows[0] as any).version || 1),
        line_items: itemsResult.rows.map((row: any) => ({
          ...row,
          scheduled_value: Number(row.scheduled_value || 0),
          approved_changes: Number(row.approved_changes || 0),
          revised_value: Number(row.revised_value || 0),
          previous_billed: Number(row.previous_billed || 0),
          current_billed: Number(row.current_billed || 0),
          total_billed: Number(row.total_billed || 0),
          percent_complete: Number(row.percent_complete || 0),
          balance_to_finish: Number(row.balance_to_finish || 0),
          retainage_percent: Number(row.retainage_percent || 10),
          retainage_held: Number(row.retainage_held || 0),
          sort_order: Number(row.sort_order || 0),
        })),
      };

      return NextResponse.json({ success: true, data: sov });
    }

    // List SOVs
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User ID is required' },
        { status: 400 }
      );
    }

    let sql = `
      SELECT sov.*, j.name as job_name,
             (SELECT COUNT(*) FROM sov_line_items WHERE sov_id = sov.id) as line_count
      FROM schedule_of_values sov
      LEFT JOIN jobs j ON sov.job_id = j.id
      WHERE sov.user_id = ?
    `;
    const args: (string | number)[] = [userId];

    if (jobId) {
      sql += ' AND sov.job_id = ?';
      args.push(jobId);
    }

    sql += ' ORDER BY sov.created_at DESC';

    const result = await client.execute({ sql, args });

    const sovs = result.rows.map((row: any) => ({
      ...row,
      total_contract_amount: Number(row.total_contract_amount || 0),
      version: Number(row.version || 1),
      line_count: Number(row.line_count || 0),
    }));

    return NextResponse.json({ success: true, data: sovs });
  } catch (error: any) {
    console.error('Error fetching SOVs:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// POST - Create SOV (or generate from estimate)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      user_id,
      job_id,
      estimate_id,
      name,
      generate_from_estimate,
    } = body;

    if (!user_id || !job_id) {
      return NextResponse.json(
        { success: false, error: 'user_id and job_id are required' },
        { status: 400 }
      );
    }

    const client = getTurso();
    const id = generateId();

    // If generating from estimate
    if (generate_from_estimate && estimate_id) {
      // Get estimate line items
      const itemsResult = await client.execute({
        sql: `
          SELECT eli.*, es.name as section_name, cc.id as cost_code_id
          FROM estimate_line_items eli
          LEFT JOIN estimate_sections es ON eli.section_id = es.id
          LEFT JOIN cost_codes cc ON eli.cost_code_id = cc.id
          WHERE eli.estimate_id = ? AND eli.include_in_sov = 1 AND eli.is_optional = 0
          ORDER BY eli.sort_order ASC
        `,
        args: [estimate_id],
      });

      // Calculate total
      let totalContractAmount = 0;
      for (const item of itemsResult.rows) {
        totalContractAmount += Number((item as any).total || 0);
      }

      // Get accepted alternates
      const alternatesResult = await client.execute({
        sql: "SELECT * FROM estimate_alternates WHERE estimate_id = ? AND status = 'accepted'",
        args: [estimate_id],
      });

      for (const alt of alternatesResult.rows) {
        const amount = Number((alt as any).amount || 0);
        if ((alt as any).type === 'add') {
          totalContractAmount += amount;
        } else {
          totalContractAmount -= amount;
        }
      }

      // Get overhead/profit
      const ohpResult = await client.execute({
        sql: 'SELECT total FROM estimate_overhead_profit WHERE estimate_id = ?',
        args: [estimate_id],
      });
      if (ohpResult.rows.length > 0) {
        totalContractAmount += Number((ohpResult.rows[0] as any).total || 0);
      }

      // Get contingency
      const contResult = await client.execute({
        sql: 'SELECT calculated_amount FROM estimate_contingency WHERE estimate_id = ?',
        args: [estimate_id],
      });
      if (contResult.rows.length > 0) {
        totalContractAmount += Number((contResult.rows[0] as any).calculated_amount || 0);
      }

      // Create SOV
      await client.execute({
        sql: `
          INSERT INTO schedule_of_values (id, user_id, job_id, estimate_id, name, total_contract_amount, status)
          VALUES (?, ?, ?, ?, ?, ?, 'draft')
        `,
        args: [id, user_id, job_id, estimate_id, name || 'Schedule of Values', totalContractAmount],
      });

      // Create SOV line items from estimate
      let lineNumber = 1;
      for (const item of itemsResult.rows) {
        const itemData = item as any;
        const lineId = generateId();
        const scheduledValue = Number(itemData.total || 0);

        await client.execute({
          sql: `
            INSERT INTO sov_line_items (
              id, sov_id, line_number, cost_code_id, description,
              scheduled_value, revised_value, balance_to_finish,
              estimate_line_item_id, sort_order
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `,
          args: [
            lineId,
            id,
            String(lineNumber),
            itemData.cost_code_id || null,
            itemData.sov_description || itemData.description,
            scheduledValue,
            scheduledValue,
            scheduledValue,
            itemData.id,
            lineNumber,
          ],
        });
        lineNumber++;
      }

      // Add accepted alternates as line items
      for (const alt of alternatesResult.rows) {
        const altData = alt as any;
        const lineId = generateId();
        const amount = altData.type === 'deduct' ? -Number(altData.amount) : Number(altData.amount);

        await client.execute({
          sql: `
            INSERT INTO sov_line_items (
              id, sov_id, line_number, cost_code_id, description,
              scheduled_value, revised_value, balance_to_finish, sort_order
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          `,
          args: [
            lineId,
            id,
            `ALT-${altData.alternate_number || lineNumber}`,
            altData.cost_code_id || null,
            `Alternate: ${altData.name}`,
            amount,
            amount,
            amount,
            lineNumber,
          ],
        });
        lineNumber++;
      }

      // Add O&P if exists
      if (ohpResult.rows.length > 0 && Number((ohpResult.rows[0] as any).total) > 0) {
        const lineId = generateId();
        const ohpAmount = Number((ohpResult.rows[0] as any).total);
        await client.execute({
          sql: `
            INSERT INTO sov_line_items (
              id, sov_id, line_number, description,
              scheduled_value, revised_value, balance_to_finish, sort_order
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `,
          args: [lineId, id, String(lineNumber), 'Overhead & Profit', ohpAmount, ohpAmount, ohpAmount, lineNumber],
        });
        lineNumber++;
      }

      // Add contingency if exists
      if (contResult.rows.length > 0 && Number((contResult.rows[0] as any).calculated_amount) > 0) {
        const lineId = generateId();
        const contAmount = Number((contResult.rows[0] as any).calculated_amount);
        await client.execute({
          sql: `
            INSERT INTO sov_line_items (
              id, sov_id, line_number, description,
              scheduled_value, revised_value, balance_to_finish, sort_order
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `,
          args: [lineId, id, String(lineNumber), 'Contingency', contAmount, contAmount, contAmount, lineNumber],
        });
      }
    } else {
      // Create empty SOV
      await client.execute({
        sql: `
          INSERT INTO schedule_of_values (id, user_id, job_id, estimate_id, name, status)
          VALUES (?, ?, ?, ?, ?, 'draft')
        `,
        args: [id, user_id, job_id, estimate_id || null, name || 'Schedule of Values'],
      });
    }

    // Return created SOV
    const result = await client.execute({
      sql: 'SELECT * FROM schedule_of_values WHERE id = ?',
      args: [id],
    });

    return NextResponse.json({ success: true, data: result.rows[0] });
  } catch (error: any) {
    console.error('Error creating SOV:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// PUT - Update SOV
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, name, status, notes, approved_by } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'SOV ID is required' },
        { status: 400 }
      );
    }

    const client = getTurso();

    const fields: string[] = [];
    const values: (string | number | null)[] = [];

    if (name !== undefined) {
      fields.push('name = ?');
      values.push(name);
    }
    if (status !== undefined) {
      fields.push('status = ?');
      values.push(status);
      if (status === 'approved') {
        fields.push("approved_at = datetime('now')");
        if (approved_by) {
          fields.push('approved_by = ?');
          values.push(approved_by);
        }
      }
    }
    if (notes !== undefined) {
      fields.push('notes = ?');
      values.push(notes);
    }

    if (fields.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No fields to update' },
        { status: 400 }
      );
    }

    fields.push("updated_at = datetime('now')");
    values.push(id);

    await client.execute({
      sql: `UPDATE schedule_of_values SET ${fields.join(', ')} WHERE id = ?`,
      args: values,
    });

    // Recalculate total
    const lineItemsTotal = await client.execute({
      sql: 'SELECT SUM(scheduled_value) as total FROM sov_line_items WHERE sov_id = ?',
      args: [id],
    });

    const total = Number((lineItemsTotal.rows[0] as any)?.total || 0);
    await client.execute({
      sql: 'UPDATE schedule_of_values SET total_contract_amount = ? WHERE id = ?',
      args: [total, id],
    });

    const result = await client.execute({
      sql: 'SELECT * FROM schedule_of_values WHERE id = ?',
      args: [id],
    });

    return NextResponse.json({ success: true, data: result.rows[0] });
  } catch (error: any) {
    console.error('Error updating SOV:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// DELETE - Delete SOV
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'SOV ID is required' },
        { status: 400 }
      );
    }

    const client = getTurso();

    // Delete line items first
    await client.execute({
      sql: 'DELETE FROM sov_line_items WHERE sov_id = ?',
      args: [id],
    });

    await client.execute({
      sql: 'DELETE FROM schedule_of_values WHERE id = ?',
      args: [id],
    });

    return NextResponse.json({ success: true, message: 'SOV deleted' });
  } catch (error: any) {
    console.error('Error deleting SOV:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
