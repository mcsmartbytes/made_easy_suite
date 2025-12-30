import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/utils/supabaseAdmin';

// GET - fetch all projects (jobs) for a user with expense totals
export async function GET(request: NextRequest) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Fetch jobs with expense counts and totals
    const { data: jobs, error: jobsError } = await supabaseAdmin
      .from('jobs')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (jobsError) throw jobsError;

    // For each job, get expense totals
    const jobsWithTotals = await Promise.all(
      (jobs || []).map(async (job) => {
        const { data: expenses } = await supabaseAdmin
          .from('expenses')
          .select('amount')
          .eq('job_id', job.id);

        const totalSpent = expenses?.reduce((sum, e) => sum + parseFloat(e.amount), 0) || 0;
        const expenseCount = expenses?.length || 0;

        return {
          ...job,
          total_spent: totalSpent,
          expense_count: expenseCount,
        };
      })
    );

    return NextResponse.json({ success: true, data: jobsWithTotals });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// POST - create a new project (job)
export async function POST(request: NextRequest) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const body = await request.json();
    const {
      user_id,
      name,
      description,
      client_name,
      budget,
      start_date,
      end_date,
      status,
    } = body;

    if (!user_id || !name) {
      return NextResponse.json(
        { success: false, error: 'User ID and project name are required' },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from('jobs')
      .insert({
        user_id,
        name: name.trim(),
        description: description || null,
        client_name: client_name || null,
        budget: budget ? parseFloat(budget) : null,
        start_date: start_date || null,
        end_date: end_date || null,
        status: status || 'active',
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// PUT - update a project
export async function PUT(request: NextRequest) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Project ID is required' },
        { status: 400 }
      );
    }

    // Clean up updates
    if (updates.name) {
      updates.name = updates.name.trim();
    }
    if (updates.budget) {
      updates.budget = parseFloat(updates.budget);
    }

    const { data, error } = await supabaseAdmin
      .from('jobs')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// DELETE - delete a project
export async function DELETE(request: NextRequest) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Project ID is required' },
        { status: 400 }
      );
    }

    // First, unlink any expenses from this project
    await supabaseAdmin
      .from('expenses')
      .update({ job_id: null })
      .eq('job_id', id);

    // Then delete the project
    const { error } = await supabaseAdmin
      .from('jobs')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
