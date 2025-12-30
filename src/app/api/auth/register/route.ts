import { NextRequest, NextResponse } from 'next/server';
import { createUser, generateToken, setAuthCookie } from '@/lib/auth';
import { getTurso, generateId } from '@/lib/turso';
import { registerSchema, validateRequest } from '@/lib/validations';

// Default categories to seed for new users
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

async function seedDefaultCategories(userId: string) {
  const client = getTurso();

  for (const cat of DEFAULT_CATEGORIES) {
    const id = generateId();
    await client.execute({
      sql: `INSERT INTO categories (id, user_id, name, icon, color, deduction_percentage, is_default)
            VALUES (?, ?, ?, ?, ?, ?, 1)`,
      args: [id, userId, cat.name, cat.icon, cat.color, cat.deduction_percentage],
    });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input
    const validation = validateRequest(registerSchema, body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    const { email, password, full_name, company_name } = validation.data;

    // Create user
    const user = await createUser(email, password, full_name, company_name || undefined);
    if (!user) {
      return NextResponse.json(
        { error: 'Failed to create user' },
        { status: 500 }
      );
    }

    // Seed default categories for the new user
    try {
      await seedDefaultCategories(user.id);
    } catch (catError) {
      console.error('Error seeding categories:', catError);
      // Don't fail registration if category seeding fails
    }

    // Generate token and set cookie
    const token = generateToken({ userId: user.id, email: user.email });
    await setAuthCookie(token);

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        full_name: user.fullName,
        company_name: user.companyName,
      },
    });
  } catch (error: any) {
    console.error('Registration error:', error);

    if (error.message === 'Email already exists') {
      return NextResponse.json(
        { error: 'An account with this email already exists' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: 'Registration failed' },
      { status: 500 }
    );
  }
}
