import { NextRequest, NextResponse } from 'next/server';
import { getTurso } from '@/lib/turso';

// GET - fetch all industry profiles
export async function GET() {
  try {
    const client = getTurso();

    const result = await client.execute(`
      SELECT * FROM industry_profiles
      WHERE is_active = 1
      ORDER BY sort_order ASC
    `);

    const profiles = result.rows.map(row => ({
      id: row.id,
      name: row.name,
      description: row.description,
      icon: row.icon,
      color: row.color,
      enabled_modules: row.enabled_modules ? JSON.parse(row.enabled_modules as string) : [],
      disabled_modules: row.disabled_modules ? JSON.parse(row.disabled_modules as string) : [],
      required_fields: row.required_fields ? JSON.parse(row.required_fields as string) : {},
      hidden_fields: row.hidden_fields ? JSON.parse(row.hidden_fields as string) : {},
      terminology: row.terminology ? JSON.parse(row.terminology as string) : {},
      default_settings: row.default_settings ? JSON.parse(row.default_settings as string) : {},
      sort_order: row.sort_order,
      created_at: row.created_at,
    }));

    return NextResponse.json({ success: true, data: profiles });
  } catch (error: any) {
    console.error('Error fetching industry profiles:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
