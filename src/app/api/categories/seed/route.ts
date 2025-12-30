import { NextRequest, NextResponse } from 'next/server';
import { getTurso, generateId } from '@/lib/turso';
import { getCurrentUser } from '@/lib/auth';

// Default categories to seed
const DEFAULT_CATEGORIES = [
  { name: 'Materials', icon: '🧱', color: '#f59e0b', deduction_percentage: 100 },
  { name: 'Labor', icon: '👷', color: '#3b82f6', deduction_percentage: 100 },
  { name: 'Equipment Rental', icon: '🚜', color: '#8b5cf6', deduction_percentage: 100 },
  { name: 'Fuel & Mileage', icon: '⛽', color: '#ef4444', deduction_percentage: 100 },
  { name: 'Tools', icon: '🔧', color: '#10b981', deduction_percentage: 100 },
  { name: 'Office Supplies', icon: '📎', color: '#6366f1', deduction_percentage: 100 },
  { name: 'Insurance', icon: '🛡️', color: '#ec4899', deduction_percentage: 100 },
  { name: 'Permits & Licenses', icon: '📋', color: '#14b8a6', deduction_percentage: 100 },
  { name: 'Subcontractors', icon: '🤝', color: '#f97316', deduction_percentage: 100 },
  { name: 'Utilities', icon: '💡', color: '#84cc16', deduction_percentage: 100 },
  { name: 'Meals & Entertainment', icon: '🍽️', color: '#a855f7', deduction_percentage: 50 },
  { name: 'Vehicle Expenses', icon: '🚗', color: '#64748b', deduction_percentage: 100 },
];

// POST - seed default categories for the logged-in user
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const userId = user.id;
    const client = getTurso();

    // Check if user already has categories
    const existing = await client.execute({
      sql: 'SELECT COUNT(*) as count FROM categories WHERE user_id = ?',
      args: [userId],
    });

    const count = Number(existing.rows[0]?.count || 0);

    if (count > 0) {
      return NextResponse.json({
        success: true,
        message: 'User already has categories',
        count,
      });
    }

    // Seed default categories
    for (const cat of DEFAULT_CATEGORIES) {
      const id = generateId();
      await client.execute({
        sql: `INSERT INTO categories (id, user_id, name, icon, color, deduction_percentage, is_default)
              VALUES (?, ?, ?, ?, ?, ?, 1)`,
        args: [id, userId, cat.name, cat.icon, cat.color, cat.deduction_percentage],
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Default categories created',
      count: DEFAULT_CATEGORIES.length,
    });
  } catch (error: any) {
    console.error('Error seeding categories:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
