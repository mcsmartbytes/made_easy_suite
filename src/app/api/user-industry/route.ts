import { NextRequest, NextResponse } from 'next/server';
import { getTurso, generateId } from '@/lib/turso';

// GET - fetch user's industry settings
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

    const result = await client.execute({
      sql: `
        SELECT uis.*, ip.name as industry_name, ip.icon, ip.color, ip.enabled_modules, ip.terminology, ip.default_settings
        FROM user_industry_settings uis
        JOIN industry_profiles ip ON uis.industry_id = ip.id
        WHERE uis.user_id = ?
      `,
      args: [userId],
    });

    if (result.rows.length === 0) {
      // No settings yet - return null with available profiles
      const profilesResult = await client.execute(`
        SELECT * FROM industry_profiles WHERE is_active = 1 ORDER BY sort_order
      `);

      const profiles = profilesResult.rows.map(row => ({
        id: row.id,
        name: row.name,
        description: row.description,
        icon: row.icon,
        color: row.color,
      }));

      return NextResponse.json({
        success: true,
        data: null,
        available_profiles: profiles,
        needs_onboarding: true,
      });
    }

    const row = result.rows[0];
    const settings = {
      id: row.id,
      user_id: row.user_id,
      industry_id: row.industry_id,
      industry_name: row.industry_name,
      icon: row.icon,
      color: row.color,
      enabled_modules: row.enabled_modules ? JSON.parse(row.enabled_modules as string) : [],
      terminology: row.terminology ? JSON.parse(row.terminology as string) : {},
      default_settings: row.default_settings ? JSON.parse(row.default_settings as string) : {},
      custom_terminology: row.custom_terminology ? JSON.parse(row.custom_terminology as string) : null,
      custom_settings: row.custom_settings ? JSON.parse(row.custom_settings as string) : null,
      onboarding_completed: Boolean(row.onboarding_completed),
      onboarding_step: row.onboarding_step,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };

    return NextResponse.json({
      success: true,
      data: settings,
      needs_onboarding: !settings.onboarding_completed,
    });
  } catch (error: any) {
    console.error('Error fetching user industry settings:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// POST - set user's industry
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { user_id, industry_id } = body;

    if (!user_id || !industry_id) {
      return NextResponse.json(
        { success: false, error: 'user_id and industry_id are required' },
        { status: 400 }
      );
    }

    const client = getTurso();

    // Check if user already has settings
    const existing = await client.execute({
      sql: 'SELECT id FROM user_industry_settings WHERE user_id = ?',
      args: [user_id],
    });

    if (existing.rows.length > 0) {
      // Update existing
      await client.execute({
        sql: `UPDATE user_industry_settings
              SET industry_id = ?, updated_at = datetime('now')
              WHERE user_id = ?`,
        args: [industry_id, user_id],
      });
    } else {
      // Create new
      const id = generateId();
      await client.execute({
        sql: `INSERT INTO user_industry_settings (id, user_id, industry_id)
              VALUES (?, ?, ?)`,
        args: [id, user_id, industry_id],
      });
    }

    // Return the updated settings
    const result = await client.execute({
      sql: `
        SELECT uis.*, ip.name as industry_name, ip.icon, ip.color, ip.enabled_modules, ip.terminology, ip.default_settings
        FROM user_industry_settings uis
        JOIN industry_profiles ip ON uis.industry_id = ip.id
        WHERE uis.user_id = ?
      `,
      args: [user_id],
    });

    const row = result.rows[0];
    const settings = {
      id: row.id,
      user_id: row.user_id,
      industry_id: row.industry_id,
      industry_name: row.industry_name,
      icon: row.icon,
      color: row.color,
      enabled_modules: row.enabled_modules ? JSON.parse(row.enabled_modules as string) : [],
      terminology: row.terminology ? JSON.parse(row.terminology as string) : {},
      default_settings: row.default_settings ? JSON.parse(row.default_settings as string) : {},
      onboarding_completed: Boolean(row.onboarding_completed),
      created_at: row.created_at,
      updated_at: row.updated_at,
    };

    return NextResponse.json({ success: true, data: settings });
  } catch (error: any) {
    console.error('Error setting user industry:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// PUT - update user's industry settings (custom terminology, settings, onboarding)
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { user_id, custom_terminology, custom_settings, onboarding_completed, onboarding_step } = body;

    if (!user_id) {
      return NextResponse.json(
        { success: false, error: 'user_id is required' },
        { status: 400 }
      );
    }

    const client = getTurso();

    const updates: string[] = [];
    const args: (string | number | null)[] = [];

    if (custom_terminology !== undefined) {
      updates.push('custom_terminology = ?');
      args.push(custom_terminology ? JSON.stringify(custom_terminology) : null);
    }

    if (custom_settings !== undefined) {
      updates.push('custom_settings = ?');
      args.push(custom_settings ? JSON.stringify(custom_settings) : null);
    }

    if (onboarding_completed !== undefined) {
      updates.push('onboarding_completed = ?');
      args.push(onboarding_completed ? 1 : 0);
    }

    if (onboarding_step !== undefined) {
      updates.push('onboarding_step = ?');
      args.push(onboarding_step);
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No fields to update' },
        { status: 400 }
      );
    }

    updates.push("updated_at = datetime('now')");
    args.push(user_id);

    await client.execute({
      sql: `UPDATE user_industry_settings SET ${updates.join(', ')} WHERE user_id = ?`,
      args,
    });

    return NextResponse.json({ success: true, message: 'Settings updated' });
  } catch (error: any) {
    console.error('Error updating user industry settings:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
