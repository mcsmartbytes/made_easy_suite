import { NextRequest, NextResponse } from 'next/server';
import { getTurso } from '@/lib/turso';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User ID is required' },
        { status: 400 }
      );
    }

    const client = getTurso();

    // Get unit occupancy stats
    const unitsResult = await client.execute({
      sql: `
        SELECT
          COUNT(*) as total_units,
          COUNT(CASE WHEN status = 'occupied' THEN 1 END) as occupied_units,
          COUNT(CASE WHEN status = 'vacant' THEN 1 END) as vacant_units
        FROM units
        WHERE user_id = ?
      `,
      args: [userId],
    });

    // Get total monthly rent from active leases
    const rentResult = await client.execute({
      sql: `
        SELECT
          COALESCE(SUM(rent_amount), 0) as total_monthly_rent
        FROM leases
        WHERE user_id = ? AND status = 'active'
      `,
      args: [userId],
    });

    // Get work order stats
    const workOrderResult = await client.execute({
      sql: `
        SELECT
          COUNT(CASE WHEN status IN ('new', 'triaged', 'assigned') THEN 1 END) as open_orders,
          COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as in_progress
        FROM work_orders
        WHERE user_id = ?
      `,
      args: [userId],
    });

    // Get work order breakdown by status and priority
    const woBreakdownResult = await client.execute({
      sql: `
        SELECT
          status,
          priority,
          COUNT(*) as count
        FROM work_orders
        WHERE user_id = ?
        GROUP BY status, priority
        ORDER BY
          CASE priority
            WHEN 'emergency' THEN 1
            WHEN 'urgent' THEN 2
            WHEN 'normal' THEN 3
            WHEN 'low' THEN 4
            ELSE 5
          END
      `,
      args: [userId],
    });

    // Get lease expirations (next 60 days)
    const leaseExpResult = await client.execute({
      sql: `
        SELECT
          l.id as lease_id,
          COALESCE(t.first_name || ' ' || t.last_name, 'Unknown') as tenant_name,
          COALESCE(u.unit_number, 'Unknown') as unit_number,
          l.end_date
        FROM leases l
        LEFT JOIN tenants t ON l.tenant_id = t.id
        LEFT JOIN units u ON l.unit_id = u.id
        WHERE l.user_id = ?
          AND l.status = 'active'
          AND l.end_date BETWEEN date('now') AND date('now', '+60 days')
        ORDER BY l.end_date
        LIMIT 20
      `,
      args: [userId],
    });

    // Calculate stats
    const totalUnits = Number(unitsResult.rows[0]?.total_units) || 0;
    const occupiedUnits = Number(unitsResult.rows[0]?.occupied_units) || 0;
    const occupancyRate = totalUnits > 0 ? Math.round((occupiedUnits / totalUnits) * 100) : 0;
    const openWorkOrders = Number(workOrderResult.rows[0]?.open_orders) || 0;

    const summary = {
      total_units: totalUnits,
      occupied_units: occupiedUnits,
      occupancy_rate: occupancyRate,
      total_monthly_rent: Number(rentResult.rows[0]?.total_monthly_rent) || 0,
      collected_this_month: 0, // Would need rent_charges table logic
      collection_rate: 0,
      open_work_orders: openWorkOrders,
    };

    const work_order_breakdown = woBreakdownResult.rows.map((row) => ({
      status: String(row.status),
      priority: String(row.priority),
      count: Number(row.count),
    }));

    const now = new Date();
    const lease_expirations = leaseExpResult.rows.map((row) => {
      const endDate = new Date(String(row.end_date));
      const daysUntil = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      return {
        lease_id: String(row.lease_id),
        tenant_name: String(row.tenant_name),
        unit_number: String(row.unit_number),
        end_date: String(row.end_date),
        days_until: daysUntil,
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        summary,
        occupancy_by_property: [], // Would need property grouping
        rent_collection: [], // Would need monthly aggregation
        work_order_breakdown,
        lease_expirations,
      },
    });
  } catch (error: any) {
    console.error('Error fetching property report:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
