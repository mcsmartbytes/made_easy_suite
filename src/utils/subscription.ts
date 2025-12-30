import { supabase } from '@/utils/supabase';

export interface SubscriptionInfo {
  plan: 'free' | 'premium' | 'pro';
  status: 'inactive' | 'active' | 'trialing' | 'past_due' | 'canceled';
  isPaidUser: boolean;
  isPremium: boolean;
  isPro: boolean;
  expenseCount: number;
  expenseLimit: number;
}

export async function getSubscription(userId: string): Promise<SubscriptionInfo> {
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('subscription_plan, subscription_status')
    .eq('user_id', userId)
    .single();

  const plan = (profile?.subscription_plan || 'free') as 'free' | 'premium' | 'pro';
  const status = (profile?.subscription_status || 'inactive') as SubscriptionInfo['status'];
  const isPaidUser = status === 'active' || status === 'trialing';

  // Get current month expense count for free users
  let expenseCount = 0;
  if (!isPaidUser) {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const { count } = await supabase
      .from('expenses')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('date', startOfMonth.toISOString().split('T')[0]);

    expenseCount = count || 0;
  }

  return {
    plan,
    status,
    isPaidUser,
    isPremium: plan === 'premium' && isPaidUser,
    isPro: plan === 'pro' && isPaidUser,
    expenseCount,
    expenseLimit: isPaidUser ? Infinity : 50,
  };
}

export async function canAddExpense(userId: string): Promise<{ allowed: boolean; message?: string; remaining?: number }> {
  const subscription = await getSubscription(userId);

  if (subscription.isPaidUser) {
    return { allowed: true };
  }

  const remaining = subscription.expenseLimit - subscription.expenseCount;

  if (remaining <= 0) {
    return {
      allowed: false,
      message: "You've reached your limit of 50 expenses this month. Upgrade to Premium for unlimited!",
      remaining: 0,
    };
  }

  return {
    allowed: true,
    remaining,
  };
}
