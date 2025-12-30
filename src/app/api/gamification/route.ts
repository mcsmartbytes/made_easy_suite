import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/utils/supabaseAdmin';
import {
  getDefaultGamificationState,
  processAction,
  getStatsSummary,
  getAchievementProgress,
  GamificationState,
  XP_AWARDS,
} from '@/lib/gamification';

// GET /api/gamification?user_id=xxx
// Returns current gamification state, stats, and achievements
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const userId = searchParams.get('user_id');

  if (!userId) {
    return NextResponse.json({ error: 'user_id is required' }, { status: 400 });
  }

  try {
    const supabaseAdmin = getSupabaseAdmin();

    // Get user profile with gamification data
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .select('preferences')
      .eq('user_id', userId)
      .single();

    let gamificationState: GamificationState;

    if (profileError || !profile) {
      // No profile yet, return defaults
      gamificationState = getDefaultGamificationState();
    } else {
      // Extract gamification state from preferences
      const preferences = profile.preferences || {};
      gamificationState = preferences.gamification || getDefaultGamificationState();
    }

    // Calculate real-time stats from database to sync state
    const syncedState = await syncStatsFromDatabase(userId, gamificationState);

    const summary = getStatsSummary(syncedState);
    const achievements = getAchievementProgress(syncedState);

    return NextResponse.json({
      state: syncedState,
      summary,
      achievements,
    });
  } catch (error) {
    console.error('Error fetching gamification state:', error);
    return NextResponse.json(
      { error: 'Failed to fetch gamification state' },
      { status: 500 }
    );
  }
}

// POST /api/gamification
// Award XP for an action
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { user_id, action, additionalData } = body;

    if (!user_id) {
      return NextResponse.json({ error: 'user_id is required' }, { status: 400 });
    }

    if (!action || !Object.keys(XP_AWARDS).includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    const supabaseAdmin = getSupabaseAdmin();

    // Get current gamification state
    const { data: profile } = await supabaseAdmin
      .from('user_profiles')
      .select('preferences')
      .eq('user_id', user_id)
      .single();

    let currentState: GamificationState;
    let existingPreferences: Record<string, unknown> = {};

    if (profile?.preferences) {
      existingPreferences = profile.preferences;
      currentState = existingPreferences.gamification as GamificationState || getDefaultGamificationState();
    } else {
      currentState = getDefaultGamificationState();
    }

    // Process the action
    const result = processAction(currentState, action as keyof typeof XP_AWARDS, additionalData);

    // Update the profile with new gamification state
    const updatedPreferences = {
      ...existingPreferences,
      gamification: result.updatedState,
    };

    // Upsert the profile
    const { error: updateError } = await supabaseAdmin
      .from('user_profiles')
      .upsert({
        user_id,
        preferences: updatedPreferences,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id',
      });

    if (updateError) {
      console.error('Error updating gamification state:', updateError);
      return NextResponse.json(
        { error: 'Failed to update gamification state' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      xpAwarded: result.xpAwarded,
      totalXP: result.totalXP,
      leveledUp: result.leveledUp,
      newLevel: result.newLevel,
      newAchievements: result.newAchievements,
      currentStreak: result.currentStreak,
      streakUpdated: result.streakUpdated,
    });
  } catch (error) {
    console.error('Error processing gamification action:', error);
    return NextResponse.json(
      { error: 'Failed to process action' },
      { status: 500 }
    );
  }
}

// Helper to sync stats from database
async function syncStatsFromDatabase(userId: string, currentState: GamificationState): Promise<GamificationState> {
  const state = { ...currentState };
  const supabaseAdmin = getSupabaseAdmin();

  try {
    // Get expense count
    const { count: expenseCount } = await supabaseAdmin
      .from('expenses')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    // Get budget count
    const { count: budgetCount } = await supabaseAdmin
      .from('budgets')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    // Get category count
    const { count: categoryCount } = await supabaseAdmin
      .from('categories')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    // Get recurring expense count
    const { count: recurringCount } = await supabaseAdmin
      .from('recurring_expenses')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    // Get total mileage
    const { data: mileageData } = await supabaseAdmin
      .from('mileage')
      .select('distance')
      .eq('user_id', userId)
      .eq('is_business', true);

    const totalMileage = mileageData?.reduce((sum, m) => sum + (m.distance || 0), 0) || 0;

    // Get receipt count (expenses with receipt_url)
    const { count: receiptCount } = await supabaseAdmin
      .from('expenses')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .not('receipt_url', 'is', null);

    // Get total deductions
    const { data: deductionData } = await supabaseAdmin
      .from('expenses')
      .select('amount, categories!inner(deduction_percentage)')
      .eq('user_id', userId)
      .eq('is_business', true);

    const totalDeductions = deductionData?.reduce((sum, e) => {
      const percentage = (e.categories as { deduction_percentage?: number })?.deduction_percentage || 0;
      return sum + (e.amount * percentage / 100);
    }, 0) || 0;

    // Update stats with real values (use max of stored vs calculated to not lose progress)
    state.stats = {
      ...state.stats,
      total_expenses_logged: Math.max(state.stats.total_expenses_logged, expenseCount || 0),
      total_budgets_created: Math.max(state.stats.total_budgets_created, budgetCount || 0),
      total_categories_created: Math.max(state.stats.total_categories_created, categoryCount || 0),
      total_recurring_expenses: Math.max(state.stats.total_recurring_expenses, recurringCount || 0),
      total_mileage_logged: Math.max(state.stats.total_mileage_logged, totalMileage),
      total_receipts_scanned: Math.max(state.stats.total_receipts_scanned, receiptCount || 0),
      total_deductions_tracked: Math.max(state.stats.total_deductions_tracked, totalDeductions),
    };

  } catch (error) {
    console.error('Error syncing stats:', error);
  }

  return state;
}
