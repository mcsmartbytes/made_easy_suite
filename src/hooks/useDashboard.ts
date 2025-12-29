'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type {
  Job,
  Estimate,
  Expense,
  Invoice,
  DashboardStats,
  ActionItem,
  ProfitRisk,
  EstimateVsActual
} from '@/types/database';

interface DashboardData {
  stats: DashboardStats;
  actionItems: ActionItem[];
  profitRisks: ProfitRisk[];
  estimateVsActual: EstimateVsActual;
  recentJobs: Job[];
  recentExpenses: Expense[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useDashboard(userId: string | undefined): DashboardData {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<DashboardStats>({
    activeJobs: 0,
    revenueMonthToDate: 0,
    revenueChange: 0,
    profitMargin: 0,
    profitMarginChange: 0,
    quotesPending: 0,
    quotesPendingValue: 0,
    openLeads: 0,
    leadsChange: 0,
  });
  const [actionItems, setActionItems] = useState<ActionItem[]>([]);
  const [profitRisks, setProfitRisks] = useState<ProfitRisk[]>([]);
  const [estimateVsActual, setEstimateVsActual] = useState<EstimateVsActual>({
    estimated: 0,
    actual: 0,
    variance: 0,
    variancePercent: 0,
  });
  const [recentJobs, setRecentJobs] = useState<Job[]>([]);
  const [recentExpenses, setRecentExpenses] = useState<Expense[]>([]);

  const fetchDashboardData = useCallback(async () => {
    if (!userId) return;

    setIsLoading(true);
    setError(null);

    try {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
      const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0).toISOString();

      // Fetch all data in parallel
      const [
        jobsResult,
        estimatesResult,
        expensesResult,
        invoicesResult,
        leadsResult,
      ] = await Promise.all([
        supabase
          .from('jobs')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false }),
        supabase
          .from('estimates')
          .select('*')
          .eq('user_id', userId),
        supabase
          .from('expenses')
          .select('*')
          .eq('user_id', userId)
          .order('date', { ascending: false })
          .limit(10),
        supabase
          .from('invoices')
          .select('*')
          .eq('user_id', userId),
        supabase
          .from('contacts')
          .select('*')
          .eq('user_id', userId)
          .in('type', ['lead', 'prospect']),
      ]);

      // Handle potential errors gracefully - tables might not exist yet
      const jobs: Job[] = jobsResult.data || [];
      const estimates: Estimate[] = estimatesResult.data || [];
      const expenses: Expense[] = expensesResult.data || [];
      const invoices: Invoice[] = invoicesResult.data || [];
      const leads = leadsResult.data || [];

      // Calculate stats
      const activeJobs = jobs.filter(j => j.status === 'active').length;

      // Revenue from paid invoices this month
      const paidThisMonth = invoices.filter(inv =>
        inv.status === 'paid' &&
        inv.paid_at &&
        new Date(inv.paid_at) >= new Date(startOfMonth)
      );
      const revenueMonthToDate = paidThisMonth.reduce((sum, inv) => sum + (inv.total || 0), 0);

      // Expenses this month
      const expensesThisMonth = expenses.filter(exp =>
        new Date(exp.date) >= new Date(startOfMonth)
      );
      const totalExpensesThisMonth = expensesThisMonth.reduce((sum, exp) => sum + (exp.amount || 0), 0);

      // Profit margin calculation
      const profitMargin = revenueMonthToDate > 0
        ? ((revenueMonthToDate - totalExpensesThisMonth) / revenueMonthToDate) * 100
        : 0;

      // Pending quotes
      const pendingQuotes = estimates.filter(e => e.status === 'sent');
      const quotesPending = pendingQuotes.length;
      const quotesPendingValue = pendingQuotes.reduce((sum, e) => sum + (e.total || 0), 0);

      // Open leads
      const openLeads = leads.filter((l: { status: string }) =>
        ['new', 'contacted', 'qualified'].includes(l.status)
      ).length;

      setStats({
        activeJobs,
        revenueMonthToDate,
        revenueChange: 18, // TODO: Calculate from last month comparison
        profitMargin: Math.round(profitMargin * 10) / 10,
        profitMarginChange: 2.1, // TODO: Calculate from last month
        quotesPending,
        quotesPendingValue,
        openLeads,
        leadsChange: -3, // TODO: Calculate from last month
      });

      // Action items
      const actions: ActionItem[] = [];

      const quotesAwaitingApproval = estimates.filter(e => e.status === 'sent').length;
      if (quotesAwaitingApproval > 0) {
        actions.push({
          label: 'Quotes awaiting approval',
          count: quotesAwaitingApproval,
          href: '/jobs?filter=quotes',
          priority: 'high',
        });
      }

      const overdueInvoices = invoices.filter(inv =>
        inv.status !== 'paid' &&
        inv.status !== 'cancelled' &&
        inv.due_date &&
        new Date(inv.due_date) < now
      ).length;
      if (overdueInvoices > 0) {
        actions.push({
          label: 'Invoices overdue',
          count: overdueInvoices,
          href: '/books?filter=overdue',
          priority: 'high',
        });
      }

      // Jobs over budget
      const overBudgetJobs = jobs.filter(j =>
        j.status === 'active' &&
        j.actual_cost &&
        j.estimated_cost &&
        j.actual_cost > j.estimated_cost
      ).length;
      if (overBudgetJobs > 0) {
        actions.push({
          label: 'Jobs over budget',
          count: overBudgetJobs,
          href: '/jobs?filter=over-budget',
          priority: 'medium',
        });
      }

      // Expenses without job assignment
      const unassignedExpenses = expenses.filter(e => !e.job_id && e.is_business).length;
      if (unassignedExpenses > 0) {
        actions.push({
          label: 'Expenses need job assignment',
          count: unassignedExpenses,
          href: '/expenses?filter=unassigned',
          priority: 'low',
        });
      }

      setActionItems(actions.length > 0 ? actions : [
        { label: 'All caught up!', count: 0, href: '#', priority: 'low' }
      ]);

      // Profit risks
      const risks: ProfitRisk[] = jobs
        .filter(j => j.status === 'active' && j.actual_cost && j.estimated_cost)
        .filter(j => (j.actual_cost! / j.estimated_cost!) > 0.8) // 80%+ of budget used
        .map(j => {
          const overrun = (j.actual_cost || 0) - (j.estimated_cost || 0);
          const percentOver = ((j.actual_cost || 0) / (j.estimated_cost || 1) - 1) * 100;
          return {
            job: j.name,
            jobId: j.id,
            issue: overrun > 0
              ? `${Math.round(percentOver)}% over budget`
              : `${Math.round(100 - (j.actual_cost! / j.estimated_cost!) * 100)}% of budget remaining`,
            impact: overrun > 0 ? `-$${Math.abs(overrun).toLocaleString()}` : 'On track',
            severity: percentOver > 10 ? 'high' as const : 'medium' as const,
          };
        })
        .slice(0, 3);

      setProfitRisks(risks.length > 0 ? risks : []);

      // Estimate vs Actual
      const estimatedProfit = jobs.reduce((sum, j) => {
        const estProfit = (j.estimated_revenue || 0) - (j.estimated_cost || 0);
        return sum + estProfit;
      }, 0);

      const actualProfit = jobs.reduce((sum, j) => {
        const actProfit = (j.actual_revenue || 0) - (j.actual_cost || 0);
        return sum + actProfit;
      }, 0);

      const variance = actualProfit - estimatedProfit;
      const variancePercent = estimatedProfit > 0
        ? (variance / estimatedProfit) * 100
        : 0;

      setEstimateVsActual({
        estimated: estimatedProfit,
        actual: actualProfit,
        variance,
        variancePercent: Math.round(variancePercent * 10) / 10,
      });

      // Recent jobs (limit to 3)
      setRecentJobs(jobs.slice(0, 3));

      // Recent expenses (already limited to 10, take 3)
      setRecentExpenses(expenses.slice(0, 3));

    } catch (err) {
      console.error('Dashboard fetch error:', err);
      setError('Failed to load dashboard data');
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  return {
    stats,
    actionItems,
    profitRisks,
    estimateVsActual,
    recentJobs,
    recentExpenses,
    isLoading,
    error,
    refresh: fetchDashboardData,
  };
}
