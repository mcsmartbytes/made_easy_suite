'use client';

import { useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useJobs } from '@/hooks/useJobs';
import { useExpenses } from '@/hooks/useExpenses';
import { useInvoices } from '@/hooks/useInvoices';
import { useContacts } from '@/hooks/useContacts';
import {
  BarChart3, TrendingUp, TrendingDown, DollarSign, Briefcase,
  Users, FileText, Calendar, Download, RefreshCw, PieChart,
  ArrowUpRight, ArrowDownRight, Clock, CheckCircle2, AlertCircle
} from 'lucide-react';

type PeriodFilter = 'month' | 'quarter' | 'year' | 'all';

export default function ReportsPage() {
  const { user } = useAuth();
  const { jobs, isLoading: jobsLoading } = useJobs(user?.id);
  const { expenses, isLoading: expensesLoading } = useExpenses(user?.id);
  const { invoices, isLoading: invoicesLoading } = useInvoices(user?.id);
  const { contacts, isLoading: contactsLoading } = useContacts(user?.id);

  const [period, setPeriod] = useState<PeriodFilter>('quarter');

  const isLoading = jobsLoading || expensesLoading || invoicesLoading || contactsLoading;

  // Filter data by period
  const getDateRange = (period: PeriodFilter): { start: Date; end: Date } => {
    const now = new Date();
    const end = new Date(now);
    let start = new Date(now);

    switch (period) {
      case 'month':
        start.setMonth(start.getMonth() - 1);
        break;
      case 'quarter':
        start.setMonth(start.getMonth() - 3);
        break;
      case 'year':
        start.setFullYear(start.getFullYear() - 1);
        break;
      case 'all':
        start = new Date(2020, 0, 1);
        break;
    }
    return { start, end };
  };

  const filteredData = useMemo(() => {
    const { start, end } = getDateRange(period);

    const filteredJobs = jobs.filter(job => {
      const date = new Date(job.created_at);
      return date >= start && date <= end;
    });

    const filteredExpenses = expenses.filter(exp => {
      const date = new Date(exp.date);
      return date >= start && date <= end;
    });

    const filteredInvoices = invoices.filter(inv => {
      const date = new Date(inv.created_at);
      return date >= start && date <= end;
    });

    return { jobs: filteredJobs, expenses: filteredExpenses, invoices: filteredInvoices };
  }, [jobs, expenses, invoices, period]);

  // Calculate metrics
  const metrics = useMemo(() => {
    // Revenue from paid invoices
    const paidInvoices = filteredData.invoices.filter(inv => inv.status === 'paid');
    const totalRevenue = paidInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0);

    // Pending revenue
    const pendingInvoices = filteredData.invoices.filter(inv => inv.status === 'sent');
    const pendingRevenue = pendingInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0);

    // Overdue
    const overdueInvoices = filteredData.invoices.filter(inv => inv.status === 'overdue');
    const overdueAmount = overdueInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0);

    // Total expenses
    const totalExpenses = filteredData.expenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);

    // Net profit
    const netProfit = totalRevenue - totalExpenses;
    const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

    // Job metrics
    const completedJobs = filteredData.jobs.filter(j => j.status === 'completed');
    const activeJobs = filteredData.jobs.filter(j => ['active', 'planned'].includes(j.status || ''));

    // Job revenue from actual amounts
    const jobRevenue = completedJobs.reduce((sum, job) => sum + (job.actual_revenue || job.estimated_revenue || 0), 0);
    const jobCosts = completedJobs.reduce((sum, job) => sum + (job.actual_cost || job.estimated_cost || 0), 0);

    // Pipeline value (planned + active jobs)
    const pipelineJobs = filteredData.jobs.filter(j => ['planned', 'active'].includes(j.status || ''));
    const pipelineValue = pipelineJobs.reduce((sum, job) => sum + (job.estimated_revenue || 0), 0);

    // CRM metrics
    const leads = contacts.filter(c => c.type === 'lead');
    const customers = contacts.filter(c => c.type === 'customer');
    const prospectValue = contacts
      .filter(c => ['prospect', 'lead'].includes(c.type || '') && c.deal_value)
      .reduce((sum, c) => sum + (c.deal_value || 0), 0);

    return {
      totalRevenue,
      pendingRevenue,
      overdueAmount,
      totalExpenses,
      netProfit,
      profitMargin,
      completedJobsCount: completedJobs.length,
      activeJobsCount: activeJobs.length,
      jobRevenue,
      jobCosts,
      pipelineValue,
      pipelineCount: pipelineJobs.length,
      leadsCount: leads.length,
      customersCount: customers.length,
      prospectValue,
      invoicesPaid: paidInvoices.length,
      invoicesPending: pendingInvoices.length,
      invoicesOverdue: overdueInvoices.length,
    };
  }, [filteredData, contacts]);

  // Expense breakdown by category
  const expenseBreakdown = useMemo(() => {
    const byCategory: Record<string, number> = {};

    filteredData.expenses.forEach(exp => {
      const category = exp.category_name || 'Uncategorized';
      byCategory[category] = (byCategory[category] || 0) + (exp.amount || 0);
    });

    const total = Object.values(byCategory).reduce((s, a) => s + a, 0);

    return Object.entries(byCategory)
      .map(([category, amount]) => ({
        category,
        amount,
        percent: total > 0 ? (amount / total) * 100 : 0
      }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 6);
  }, [filteredData.expenses]);

  // Top performing jobs
  const topJobs = useMemo(() => {
    return filteredData.jobs
      .filter(job => job.status === 'completed' && (job.actual_revenue || job.estimated_revenue))
      .map(job => {
        const revenue = job.actual_revenue || job.estimated_revenue || 0;
        const cost = job.actual_cost || job.estimated_cost || 0;
        const profit = revenue - cost;
        const margin = revenue > 0 ? (profit / revenue) * 100 : 0;
        return {
          id: job.id,
          name: job.name,
          revenue,
          cost,
          profit,
          margin
        };
      })
      .sort((a, b) => b.profit - a.profit)
      .slice(0, 5);
  }, [filteredData.jobs]);

  // Monthly trend data
  const monthlyTrend = useMemo(() => {
    const months: Record<string, { revenue: number; expenses: number; profit: number }> = {};
    const now = new Date();

    // Initialize last 6 months
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = d.toLocaleDateString('en-US', { month: 'short' });
      months[key] = { revenue: 0, expenses: 0, profit: 0 };
    }

    // Add invoice revenue
    invoices.filter(inv => inv.status === 'paid' && inv.paid_at).forEach(inv => {
      const d = new Date(inv.paid_at!);
      const key = d.toLocaleDateString('en-US', { month: 'short' });
      if (months[key]) {
        months[key].revenue += inv.total || 0;
      }
    });

    // Add expenses
    expenses.forEach(exp => {
      const d = new Date(exp.date);
      const key = d.toLocaleDateString('en-US', { month: 'short' });
      if (months[key]) {
        months[key].expenses += exp.amount || 0;
      }
    });

    // Calculate profit
    Object.keys(months).forEach(key => {
      months[key].profit = months[key].revenue - months[key].expenses;
    });

    return Object.entries(months).map(([month, data]) => ({
      month,
      ...data
    }));
  }, [invoices, expenses]);

  // Format currency
  const formatCurrency = (amount: number, short = false) => {
    if (short && Math.abs(amount) >= 1000) {
      return `$${(amount / 1000).toFixed(1)}K`;
    }
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const maxRevenue = Math.max(...monthlyTrend.map(m => m.revenue), 1);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
          <p className="text-gray-600">Financial overview and business analytics</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg">
            {(['month', 'quarter', 'year', 'all'] as PeriodFilter[]).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  period === p
                    ? 'bg-white shadow-sm text-gray-900'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {p === 'month' ? '1M' : p === 'quarter' ? '3M' : p === 'year' ? '1Y' : 'All'}
              </button>
            ))}
          </div>
          <button className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Export</span>
          </button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(metrics.totalRevenue, true)}</p>
              <p className="text-sm text-gray-500">Revenue</p>
            </div>
          </div>
          {metrics.pendingRevenue > 0 && (
            <p className="mt-2 text-xs text-amber-600">+{formatCurrency(metrics.pendingRevenue)} pending</p>
          )}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
              <TrendingDown className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(metrics.totalExpenses, true)}</p>
              <p className="text-sm text-gray-500">Expenses</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
              metrics.netProfit >= 0 ? 'bg-green-100' : 'bg-red-100'
            }`}>
              {metrics.netProfit >= 0 ? (
                <TrendingUp className="w-5 h-5 text-green-600" />
              ) : (
                <TrendingDown className="w-5 h-5 text-red-600" />
              )}
            </div>
            <div>
              <p className={`text-2xl font-bold ${metrics.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(metrics.netProfit, true)}
              </p>
              <p className="text-sm text-gray-500">Net Profit</p>
            </div>
          </div>
          <p className="mt-2 text-xs text-gray-500">{metrics.profitMargin.toFixed(1)}% margin</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(metrics.pipelineValue, true)}</p>
              <p className="text-sm text-gray-500">Pipeline</p>
            </div>
          </div>
          <p className="mt-2 text-xs text-gray-500">{metrics.pipelineCount} opportunities</p>
        </div>
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-2 text-gray-500 mb-1">
            <CheckCircle2 className="w-4 h-4" />
            <span className="text-xs">Completed</span>
          </div>
          <p className="text-xl font-bold text-gray-900">{metrics.completedJobsCount}</p>
          <p className="text-xs text-gray-500">jobs</p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-2 text-gray-500 mb-1">
            <Clock className="w-4 h-4" />
            <span className="text-xs">Active</span>
          </div>
          <p className="text-xl font-bold text-gray-900">{metrics.activeJobsCount}</p>
          <p className="text-xs text-gray-500">jobs</p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-2 text-green-600 mb-1">
            <FileText className="w-4 h-4" />
            <span className="text-xs">Paid</span>
          </div>
          <p className="text-xl font-bold text-gray-900">{metrics.invoicesPaid}</p>
          <p className="text-xs text-gray-500">invoices</p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-2 text-amber-600 mb-1">
            <FileText className="w-4 h-4" />
            <span className="text-xs">Pending</span>
          </div>
          <p className="text-xl font-bold text-gray-900">{metrics.invoicesPending}</p>
          <p className="text-xs text-gray-500">invoices</p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-2 text-gray-500 mb-1">
            <Users className="w-4 h-4" />
            <span className="text-xs">Customers</span>
          </div>
          <p className="text-xl font-bold text-gray-900">{metrics.customersCount}</p>
          <p className="text-xs text-gray-500">active</p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-2 text-blue-600 mb-1">
            <Users className="w-4 h-4" />
            <span className="text-xs">Leads</span>
          </div>
          <p className="text-xl font-bold text-gray-900">{metrics.leadsCount}</p>
          <p className="text-xs text-gray-500">{formatCurrency(metrics.prospectValue)} value</p>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Revenue Trend */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Monthly Revenue Trend</h2>
          <div className="space-y-3">
            {monthlyTrend.map((month) => (
              <div key={month.month} className="flex items-center gap-4">
                <span className="w-8 text-sm text-gray-500">{month.month}</span>
                <div className="flex-1">
                  <div className="h-6 bg-gray-100 rounded-full overflow-hidden flex">
                    <div
                      className="h-full bg-blue-500 transition-all"
                      style={{ width: `${(month.revenue / maxRevenue) * 100}%` }}
                    />
                    {month.profit > 0 && (
                      <div
                        className="h-full bg-green-500 transition-all -ml-1"
                        style={{ width: `${(month.profit / maxRevenue) * 100}%` }}
                      />
                    )}
                  </div>
                </div>
                <div className="w-24 text-right">
                  <span className="text-sm font-medium text-gray-900">{formatCurrency(month.revenue, true)}</span>
                  {month.profit !== 0 && (
                    <span className={`text-xs block ${month.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {month.profit >= 0 ? '+' : ''}{formatCurrency(month.profit, true)}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-4 mt-4 pt-4 border-t border-gray-100">
            <span className="flex items-center gap-2 text-sm text-gray-600">
              <span className="w-3 h-3 bg-blue-500 rounded-full" /> Revenue
            </span>
            <span className="flex items-center gap-2 text-sm text-gray-600">
              <span className="w-3 h-3 bg-green-500 rounded-full" /> Profit
            </span>
          </div>
        </div>

        {/* Expense Breakdown */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Expense Breakdown</h2>
            <span className="text-sm text-gray-500">{formatCurrency(metrics.totalExpenses)} total</span>
          </div>
          {expenseBreakdown.length > 0 ? (
            <div className="space-y-4">
              {expenseBreakdown.map((expense, i) => (
                <div key={expense.category}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">{expense.category}</span>
                    <span className="font-medium text-gray-900">{formatCurrency(expense.amount)}</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-blue-500 to-blue-400 transition-all"
                      style={{ width: `${expense.percent}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">{expense.percent.toFixed(1)}%</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-gray-400">
              <PieChart className="w-12 h-12 mb-2" />
              <p className="text-sm">No expenses in this period</p>
            </div>
          )}
        </div>
      </div>

      {/* Top Jobs Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Top Performing Jobs</h2>
          <span className="text-sm text-gray-500">{topJobs.length} completed</span>
        </div>
        {topJobs.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Job</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Revenue</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Cost</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Profit</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Margin</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {topJobs.map((job) => (
                  <tr key={job.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-medium text-gray-900">{job.name}</td>
                    <td className="px-6 py-4 text-right text-gray-900">{formatCurrency(job.revenue)}</td>
                    <td className="px-6 py-4 text-right text-gray-500">{formatCurrency(job.cost)}</td>
                    <td className={`px-6 py-4 text-right font-medium ${job.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(job.profit)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        job.margin >= 30 ? 'bg-green-100 text-green-700' :
                        job.margin >= 15 ? 'bg-amber-100 text-amber-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {job.margin.toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-gray-400">
            <Briefcase className="w-12 h-12 mb-2" />
            <p className="text-sm">No completed jobs in this period</p>
          </div>
        )}
      </div>

      {/* Invoices & Receivables */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Invoice Status */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Invoice Status</h2>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <CheckCircle2 className="w-6 h-6 text-green-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-green-600">{metrics.invoicesPaid}</p>
              <p className="text-xs text-gray-600">Paid</p>
              <p className="text-sm font-medium text-gray-900 mt-1">{formatCurrency(metrics.totalRevenue)}</p>
            </div>
            <div className="text-center p-4 bg-amber-50 rounded-lg">
              <Clock className="w-6 h-6 text-amber-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-amber-600">{metrics.invoicesPending}</p>
              <p className="text-xs text-gray-600">Pending</p>
              <p className="text-sm font-medium text-gray-900 mt-1">{formatCurrency(metrics.pendingRevenue)}</p>
            </div>
            <div className="text-center p-4 bg-red-50 rounded-lg">
              <AlertCircle className="w-6 h-6 text-red-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-red-600">{metrics.invoicesOverdue}</p>
              <p className="text-xs text-gray-600">Overdue</p>
              <p className="text-sm font-medium text-gray-900 mt-1">{formatCurrency(metrics.overdueAmount)}</p>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Business Health</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Profit Margin</span>
              <div className="flex items-center gap-2">
                <div className="w-32 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      metrics.profitMargin >= 30 ? 'bg-green-500' :
                      metrics.profitMargin >= 15 ? 'bg-amber-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${Math.min(metrics.profitMargin, 100)}%` }}
                  />
                </div>
                <span className="text-sm font-medium text-gray-900 w-12 text-right">
                  {metrics.profitMargin.toFixed(0)}%
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Collection Rate</span>
              <div className="flex items-center gap-2">
                <div className="w-32 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 rounded-full"
                    style={{
                      width: `${metrics.invoicesPaid + metrics.invoicesPending > 0
                        ? (metrics.invoicesPaid / (metrics.invoicesPaid + metrics.invoicesPending)) * 100
                        : 0}%`
                    }}
                  />
                </div>
                <span className="text-sm font-medium text-gray-900 w-12 text-right">
                  {metrics.invoicesPaid + metrics.invoicesPending > 0
                    ? ((metrics.invoicesPaid / (metrics.invoicesPaid + metrics.invoicesPending)) * 100).toFixed(0)
                    : 0}%
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Lead Conversion</span>
              <div className="flex items-center gap-2">
                <div className="w-32 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-purple-500 rounded-full"
                    style={{
                      width: `${metrics.leadsCount + metrics.customersCount > 0
                        ? (metrics.customersCount / (metrics.leadsCount + metrics.customersCount)) * 100
                        : 0}%`
                    }}
                  />
                </div>
                <span className="text-sm font-medium text-gray-900 w-12 text-right">
                  {metrics.leadsCount + metrics.customersCount > 0
                    ? ((metrics.customersCount / (metrics.leadsCount + metrics.customersCount)) * 100).toFixed(0)
                    : 0}%
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
