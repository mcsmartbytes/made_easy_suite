import { NextRequest, NextResponse } from 'next/server';
import { getTurso, generateId } from '@/lib/turso';

// GET - Get invites for a bid package
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: bidPackageId } = await params;

    const client = getTurso();

    const result = await client.execute({
      sql: `
        SELECT i.*, s.company_name, s.contact_name, s.email, s.phone, s.primary_trade,
               s.license_verified, s.coi_on_file, s.w9_on_file, s.insurance_expiry
        FROM bid_package_invites i
        JOIN subcontractors s ON i.subcontractor_id = s.id
        WHERE i.bid_package_id = ?
        ORDER BY i.invited_at DESC
      `,
      args: [bidPackageId],
    });

    const invites = result.rows.map((row: any) => ({
      ...row,
      license_verified: Boolean(row.license_verified),
      coi_on_file: Boolean(row.coi_on_file),
      w9_on_file: Boolean(row.w9_on_file),
    }));

    return NextResponse.json({ success: true, data: invites });
  } catch (error: any) {
    console.error('Error fetching invites:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// POST - Create invites (bulk)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: bidPackageId } = await params;
    const body = await request.json();
    const { subcontractor_ids, invited_via = 'email' } = body;

    if (!subcontractor_ids || !Array.isArray(subcontractor_ids) || subcontractor_ids.length === 0) {
      return NextResponse.json(
        { success: false, error: 'subcontractor_ids array is required' },
        { status: 400 }
      );
    }

    const client = getTurso();
    const created: string[] = [];

    for (const subId of subcontractor_ids) {
      // Check if already invited
      const existing = await client.execute({
        sql: 'SELECT id FROM bid_package_invites WHERE bid_package_id = ? AND subcontractor_id = ?',
        args: [bidPackageId, subId],
      });

      if (existing.rows.length === 0) {
        const id = generateId();
        await client.execute({
          sql: `
            INSERT INTO bid_package_invites (id, bid_package_id, subcontractor_id, invited_via, status)
            VALUES (?, ?, ?, ?, 'pending')
          `,
          args: [id, bidPackageId, subId, invited_via],
        });
        created.push(id);
      }
    }

    // Update bid package status to 'open' if it was 'draft'
    await client.execute({
      sql: "UPDATE bid_packages SET status = 'open', updated_at = datetime('now') WHERE id = ? AND status = 'draft'",
      args: [bidPackageId],
    });

    return NextResponse.json({
      success: true,
      data: { invites_created: created.length },
      message: `${created.length} invite(s) sent`
    });
  } catch (error: any) {
    console.error('Error creating invites:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// DELETE - Remove an invite
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const inviteId = searchParams.get('invite_id');

    if (!inviteId) {
      return NextResponse.json(
        { success: false, error: 'invite_id is required' },
        { status: 400 }
      );
    }

    const client = getTurso();

    await client.execute({
      sql: 'DELETE FROM bid_package_invites WHERE id = ?',
      args: [inviteId],
    });

    return NextResponse.json({ success: true, message: 'Invite removed' });
  } catch (error: any) {
    console.error('Error deleting invite:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
