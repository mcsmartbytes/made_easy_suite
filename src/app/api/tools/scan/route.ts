import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/turso';

// POST - look up a tool by QR code or asset tag
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { code, user_id } = body;

    if (!code) {
      return NextResponse.json(
        { success: false, error: 'Code is required' },
        { status: 400 }
      );
    }

    const trimmedCode = code.trim().toUpperCase();

    // Try to find by QR code first
    let sql = `
      SELECT t.*, tc.id as cat_id, tc.name as cat_name, tc.icon as cat_icon, tc.color as cat_color,
             j.id as job_id, j.name as job_name
      FROM tools t
      LEFT JOIN tool_categories tc ON t.category_id = tc.id
      LEFT JOIN jobs j ON t.assigned_to_job = j.id
      WHERE t.qr_code = ?
    `;
    let args: (string | null)[] = [trimmedCode];

    if (user_id) {
      sql += ' AND t.user_id = ?';
      args.push(user_id);
    }

    let row = await queryOne<any>(sql, args);

    // If not found, try asset tag
    if (!row) {
      let assetSql = `
        SELECT t.*, tc.id as cat_id, tc.name as cat_name, tc.icon as cat_icon, tc.color as cat_color,
               j.id as job_id, j.name as job_name
        FROM tools t
        LEFT JOIN tool_categories tc ON t.category_id = tc.id
        LEFT JOIN jobs j ON t.assigned_to_job = j.id
        WHERE t.asset_tag = ?
      `;
      let assetArgs: (string | null)[] = [code.trim()];

      if (user_id) {
        assetSql += ' AND t.user_id = ?';
        assetArgs.push(user_id);
      }

      row = await queryOne<any>(assetSql, assetArgs);
    }

    if (!row) {
      return NextResponse.json(
        { success: false, error: 'Tool not found', code },
        { status: 404 }
      );
    }

    // Transform to include nested objects
    const tool = {
      ...row,
      tool_categories: row.cat_id ? {
        id: row.cat_id,
        name: row.cat_name,
        icon: row.cat_icon,
        color: row.cat_color,
      } : null,
      jobs: row.job_id ? {
        id: row.job_id,
        name: row.job_name,
      } : null,
    };

    // Get active checkout if any
    const activeCheckout = await queryOne<any>(
      `SELECT tc.*, j.id as job_id, j.name as job_name
       FROM tool_checkouts tc
       LEFT JOIN jobs j ON tc.checked_out_to_job_id = j.id
       WHERE tc.tool_id = ? AND tc.checked_in_at IS NULL`,
      [tool.id]
    );

    const activeCheckoutData = activeCheckout ? {
      ...activeCheckout,
      jobs: activeCheckout.job_id ? {
        id: activeCheckout.job_id,
        name: activeCheckout.job_name,
      } : null,
    } : null;

    // Get recent checkout history
    const historyRows = await query<any>(
      `SELECT tc.*, j.id as job_id, j.name as job_name
       FROM tool_checkouts tc
       LEFT JOIN jobs j ON tc.checked_out_to_job_id = j.id
       WHERE tc.tool_id = ?
       ORDER BY tc.checked_out_at DESC
       LIMIT 5`,
      [tool.id]
    );

    const recentHistory = historyRows.map((h: any) => ({
      ...h,
      jobs: h.job_id ? {
        id: h.job_id,
        name: h.job_name,
      } : null,
    }));

    return NextResponse.json({
      success: true,
      data: {
        tool,
        activeCheckout: activeCheckoutData,
        recentHistory,
      },
    });
  } catch (error: any) {
    console.error('Error scanning tool:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
