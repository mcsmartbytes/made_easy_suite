import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/utils/supabaseAdmin';

// GET - fetch a single project with its expenses
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Project ID is required' },
        { status: 400 }
      );
    }

    // Fetch the project
    const { data: project, error: projectError } = await supabaseAdmin
      .from('jobs')
      .select('*')
      .eq('id', id)
      .single();

    if (projectError) throw projectError;

    // Fetch expenses for this project
    const { data: expenses, error: expensesError } = await supabaseAdmin
      .from('expenses')
      .select('*, categories(id, name, icon, color)')
      .eq('job_id', id)
      .order('date', { ascending: false });

    if (expensesError) throw expensesError;

    // Calculate totals
    const totalSpent = expenses?.reduce((sum, e) => sum + parseFloat(e.amount), 0) || 0;
    const expenseCount = expenses?.length || 0;

    // Calculate by category
    const byCategory: Record<string, { name: string; icon: string; color: string; total: number; count: number }> = {};
    expenses?.forEach((expense) => {
      const catId = expense.category_id || 'uncategorized';
      const catName = expense.categories?.name || 'Uncategorized';
      const catIcon = expense.categories?.icon || '📦';
      const catColor = expense.categories?.color || '#6B7280';

      if (!byCategory[catId]) {
        byCategory[catId] = { name: catName, icon: catIcon, color: catColor, total: 0, count: 0 };
      }
      byCategory[catId].total += parseFloat(expense.amount);
      byCategory[catId].count += 1;
    });

    return NextResponse.json({
      success: true,
      data: {
        ...project,
        total_spent: totalSpent,
        expense_count: expenseCount,
        expenses: expenses || [],
        by_category: Object.values(byCategory).sort((a, b) => b.total - a.total),
        budget_remaining: project.budget ? project.budget - totalSpent : null,
        budget_percentage: project.budget ? Math.round((totalSpent / project.budget) * 100) : null,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
