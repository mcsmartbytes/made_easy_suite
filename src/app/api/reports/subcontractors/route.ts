import { NextRequest, NextResponse } from 'next/server';
import { getTurso } from '@/lib/turso';

function getComplianceStatus(expiryDate: string | null): 'valid' | 'expiring' | 'expired' | 'missing' {
  if (!expiryDate) return 'missing';

  const expiry = new Date(expiryDate);
  const now = new Date();
  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

  if (expiry < now) return 'expired';
  if (expiry < thirtyDaysFromNow) return 'expiring';
  return 'valid';
}

function calculateComplianceScore(sub: any): number {
  let score = 0;
  let total = 0;

  // Insurance (25 points)
  total += 25;
  const insuranceStatus = getComplianceStatus(sub.insurance_expiry);
  if (insuranceStatus === 'valid') score += 25;
  else if (insuranceStatus === 'expiring') score += 15;

  // License (25 points)
  total += 25;
  const licenseStatus = getComplianceStatus(sub.license_expiry);
  if (licenseStatus === 'valid') score += 25;
  else if (licenseStatus === 'expiring') score += 15;

  // Workers Comp (25 points)
  total += 25;
  const wcStatus = getComplianceStatus(sub.workers_comp_expiry);
  if (wcStatus === 'valid') score += 25;
  else if (wcStatus === 'expiring') score += 15;

  // COI on file (12.5 points)
  total += 12.5;
  if (sub.coi_on_file) score += 12.5;

  // W9 on file (12.5 points)
  total += 12.5;
  if (sub.w9_on_file) score += 12.5;

  return Math.round((score / total) * 100);
}

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

    // Get all subcontractors
    const subsResult = await client.execute({
      sql: `
        SELECT
          id, company_name, primary_trade,
          coi_on_file, w9_on_file,
          insurance_expiry, license_expiry, workers_comp_expiry,
          rating
        FROM subcontractors
        WHERE user_id = ?
        ORDER BY company_name
      `,
      args: [userId],
    });

    const compliance_items = subsResult.rows.map((row) => {
      const insuranceStatus = getComplianceStatus(row.insurance_expiry as string | null);
      const licenseStatus = getComplianceStatus(row.license_expiry as string | null);
      const wcStatus = getComplianceStatus(row.workers_comp_expiry as string | null);
      const overallScore = calculateComplianceScore(row);

      return {
        subcontractor_id: String(row.id),
        company_name: String(row.company_name),
        trade: row.primary_trade ? String(row.primary_trade) : null,
        insurance_status: insuranceStatus,
        insurance_expiry: row.insurance_expiry ? String(row.insurance_expiry) : null,
        license_status: licenseStatus,
        license_expiry: row.license_expiry ? String(row.license_expiry) : null,
        w9_on_file: Boolean(row.w9_on_file),
        coi_on_file: Boolean(row.coi_on_file),
        workers_comp_status: wcStatus,
        workers_comp_expiry: row.workers_comp_expiry ? String(row.workers_comp_expiry) : null,
        rating: row.rating ? Number(row.rating) : null,
        overall_score: overallScore,
      };
    });

    // Calculate summary stats
    const totalSubs = compliance_items.length;
    const fullyCompliant = compliance_items.filter(s => s.overall_score === 100).length;
    const expiringSoon = compliance_items.filter(s =>
      s.insurance_status === 'expiring' ||
      s.license_status === 'expiring' ||
      s.workers_comp_status === 'expiring'
    ).length;
    const expired = compliance_items.filter(s =>
      s.insurance_status === 'expired' ||
      s.license_status === 'expired' ||
      s.workers_comp_status === 'expired'
    ).length;

    // Get expiring documents (next 30 days)
    const expiringDocs: {
      subcontractor_id: string;
      company_name: string;
      doc_type: string;
      expiry_date: string;
      days_until: number;
    }[] = [];

    const now = new Date();
    compliance_items.forEach((sub) => {
      const docTypes = [
        { type: 'Insurance', expiry: sub.insurance_expiry, status: sub.insurance_status },
        { type: 'License', expiry: sub.license_expiry, status: sub.license_status },
        { type: 'Workers Comp', expiry: sub.workers_comp_expiry, status: sub.workers_comp_status },
      ];

      docTypes.forEach(doc => {
        if (doc.expiry && (doc.status === 'expiring' || doc.status === 'expired')) {
          const expiry = new Date(doc.expiry);
          const daysUntil = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          expiringDocs.push({
            subcontractor_id: sub.subcontractor_id,
            company_name: sub.company_name,
            doc_type: doc.type,
            expiry_date: doc.expiry,
            days_until: daysUntil,
          });
        }
      });
    });

    // Sort by days until expiry
    expiringDocs.sort((a, b) => a.days_until - b.days_until);

    // Get breakdown by trade
    const tradeMap = new Map<string, { count: number; ratings: number[]; compliant: number }>();
    compliance_items.forEach((sub) => {
      const trade = sub.trade || 'Unknown';
      if (!tradeMap.has(trade)) {
        tradeMap.set(trade, { count: 0, ratings: [], compliant: 0 });
      }
      const entry = tradeMap.get(trade)!;
      entry.count++;
      if (sub.rating) entry.ratings.push(sub.rating);
      if (sub.overall_score === 100) entry.compliant++;
    });

    const by_trade = Array.from(tradeMap.entries()).map(([trade, data]) => ({
      trade,
      count: data.count,
      avg_rating: data.ratings.length > 0
        ? Math.round(data.ratings.reduce((a, b) => a + b, 0) / data.ratings.length * 10) / 10
        : 0,
      compliant_count: data.compliant,
    }));

    return NextResponse.json({
      success: true,
      data: {
        summary: {
          total_subs: totalSubs,
          fully_compliant: fullyCompliant,
          expiring_soon: expiringSoon,
          expired,
        },
        compliance_items,
        expiring_documents: expiringDocs.slice(0, 20),
        by_trade,
      },
    });
  } catch (error: any) {
    console.error('Error fetching subcontractor report:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
