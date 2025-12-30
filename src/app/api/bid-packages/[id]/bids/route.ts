import { NextRequest, NextResponse } from 'next/server';
import { getTurso, generateId } from '@/lib/turso';

// GET - Get bids for a bid package
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: bidPackageId } = await params;

    const client = getTurso();

    const result = await client.execute({
      sql: `
        SELECT b.*, s.company_name, s.contact_name, s.email, s.phone, s.primary_trade,
               s.rating, s.projects_completed,
               s.license_verified, s.coi_on_file, s.w9_on_file, s.insurance_expiry
        FROM subcontractor_bids b
        JOIN subcontractors s ON b.subcontractor_id = s.id
        WHERE b.bid_package_id = ?
        ORDER BY b.base_bid ASC
      `,
      args: [bidPackageId],
    });

    const bids = result.rows.map((row: any) => ({
      ...row,
      base_bid: Number(row.base_bid),
      labor_cost: row.labor_cost ? Number(row.labor_cost) : null,
      material_cost: row.material_cost ? Number(row.material_cost) : null,
      equipment_cost: row.equipment_cost ? Number(row.equipment_cost) : null,
      overhead_profit: row.overhead_profit ? Number(row.overhead_profit) : null,
      score: row.score ? Number(row.score) : null,
      rating: row.rating ? Number(row.rating) : null,
      projects_completed: Number(row.projects_completed || 0),
      license_verified: Boolean(row.license_verified),
      coi_on_file: Boolean(row.coi_on_file),
      w9_on_file: Boolean(row.w9_on_file),
      compliance_verified: Boolean(row.compliance_verified),
      alternates: row.alternates ? JSON.parse(row.alternates) : [],
      attachments: row.attachments ? JSON.parse(row.attachments) : [],
    }));

    return NextResponse.json({ success: true, data: bids });
  } catch (error: any) {
    console.error('Error fetching bids:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// POST - Submit a bid
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: bidPackageId } = await params;
    const body = await request.json();
    const {
      subcontractor_id,
      base_bid,
      labor_cost,
      material_cost,
      equipment_cost,
      overhead_profit,
      alternates,
      assumptions,
      clarifications,
      exclusions,
      proposed_start,
      proposed_duration,
      lead_time,
      attachments,
    } = body;

    if (!subcontractor_id || base_bid === undefined) {
      return NextResponse.json(
        { success: false, error: 'subcontractor_id and base_bid are required' },
        { status: 400 }
      );
    }

    const client = getTurso();
    const id = generateId();

    // Check subcontractor compliance
    const subResult = await client.execute({
      sql: 'SELECT license_verified, coi_on_file, w9_on_file FROM subcontractors WHERE id = ?',
      args: [subcontractor_id],
    });

    const sub = subResult.rows[0] as any;
    const complianceVerified = sub && sub.license_verified && sub.coi_on_file && sub.w9_on_file ? 1 : 0;

    await client.execute({
      sql: `
        INSERT INTO subcontractor_bids (
          id, bid_package_id, subcontractor_id, base_bid,
          labor_cost, material_cost, equipment_cost, overhead_profit,
          alternates, assumptions, clarifications, exclusions,
          proposed_start, proposed_duration, lead_time,
          compliance_verified, attachments, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'submitted')
      `,
      args: [
        id,
        bidPackageId,
        subcontractor_id,
        base_bid,
        labor_cost || null,
        material_cost || null,
        equipment_cost || null,
        overhead_profit || null,
        alternates ? JSON.stringify(alternates) : null,
        assumptions || null,
        clarifications || null,
        exclusions || null,
        proposed_start || null,
        proposed_duration || null,
        lead_time || null,
        complianceVerified,
        attachments ? JSON.stringify(attachments) : null,
      ],
    });

    // Update invite status to 'submitted'
    await client.execute({
      sql: "UPDATE bid_package_invites SET status = 'submitted' WHERE bid_package_id = ? AND subcontractor_id = ?",
      args: [bidPackageId, subcontractor_id],
    });

    // Update bid package status to 'reviewing' if first bid
    await client.execute({
      sql: "UPDATE bid_packages SET status = 'reviewing', updated_at = datetime('now') WHERE id = ? AND status = 'open'",
      args: [bidPackageId],
    });

    const result = await client.execute({
      sql: 'SELECT * FROM subcontractor_bids WHERE id = ?',
      args: [id],
    });

    return NextResponse.json({ success: true, data: result.rows[0] });
  } catch (error: any) {
    console.error('Error creating bid:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// PUT - Update bid (score, status, notes)
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { bid_id, score, status, evaluator_notes } = body;

    if (!bid_id) {
      return NextResponse.json(
        { success: false, error: 'bid_id is required' },
        { status: 400 }
      );
    }

    const client = getTurso();

    const fields: string[] = [];
    const values: (string | number | null)[] = [];

    if (score !== undefined) {
      fields.push('score = ?');
      values.push(score);
    }
    if (status) {
      fields.push('status = ?');
      values.push(status);
    }
    if (evaluator_notes !== undefined) {
      fields.push('evaluator_notes = ?');
      values.push(evaluator_notes);
    }

    if (fields.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No fields to update' },
        { status: 400 }
      );
    }

    fields.push("reviewed_at = datetime('now')");
    values.push(bid_id);

    await client.execute({
      sql: `UPDATE subcontractor_bids SET ${fields.join(', ')} WHERE id = ?`,
      args: values,
    });

    // If status is 'selected', award the bid package
    if (status === 'selected') {
      const bidResult = await client.execute({
        sql: 'SELECT bid_package_id, subcontractor_id, base_bid FROM subcontractor_bids WHERE id = ?',
        args: [bid_id],
      });
      const bid = bidResult.rows[0] as any;

      if (bid) {
        await client.execute({
          sql: `
            UPDATE bid_packages
            SET status = 'awarded', awarded_to = ?, awarded_amount = ?, awarded_at = datetime('now'), updated_at = datetime('now')
            WHERE id = ?
          `,
          args: [bid.subcontractor_id, bid.base_bid, bid.bid_package_id],
        });

        // Reject other bids
        await client.execute({
          sql: "UPDATE subcontractor_bids SET status = 'rejected', reviewed_at = datetime('now') WHERE bid_package_id = ? AND id != ?",
          args: [bid.bid_package_id, bid_id],
        });
      }
    }

    const result = await client.execute({
      sql: 'SELECT * FROM subcontractor_bids WHERE id = ?',
      args: [bid_id],
    });

    return NextResponse.json({ success: true, data: result.rows[0] });
  } catch (error: any) {
    console.error('Error updating bid:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
