'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useDashboard } from '@/hooks/useDashboard';
import {
  Briefcase,
  DollarSign,
  TrendingUp,
  Users,
  Receipt,
  FileText,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  AlertTriangle,
  AlertCircle,
  ChevronRight,
  Target,
  Zap,
  RefreshCw,
  Database
} from 'lucide-react';
import Link from 'next/link';

// Demo data for when database tables don't exist yet
const DEMO_DATA = {
  stats: {
    activeJobs: 12,
    revenueMonthToDate: 24580,
    revenueChange: 18,
    profitMargin: 34.2,
    profitMarginChange: 2.1,
    quotesPending: 5,
    quotesPendingValue: 18200,
    openLeads: 8,
    leadsChange: -3,
  },
  actionItems: [
    { label: 'Quotes awaiting approval', count: 3, href: '/jobs?filter=quotes', priority: 'high' as const, action: 'Follow up with clients' },
    { label: 'Invoices overdue', count: 2, href: '/books?filter=overdue', priority: 'high' as const, action: 'Send payment reminders' },
    { label: 'Jobs over budget', count: 1, href: '/jobs?filter=over-budget', priority: 'medium' as const, action: 'Review labor entries' },
    { label: 'Expenses need job assignment', count: 4, href: '/expenses?filter=unassigned', priority: 'low' as const, action: 'Assign to jobs' },
  ],
  profitRisks: [
    { job: 'ABC Corp Parking Lot', jobId: '1', issue: 'Labor trending 18% over estimate', impact: '-$890', severity: 'high' as const, action: 'Review time entries' },
    { job: 'City Mall Section B', jobId: '2', issue: 'Materials overspend', impact: '-$340', severity: 'medium' as const, action: 'Check material receipts' },
    { job: 'Johnson Residence', jobId: '3', issue: 'Scope creep - 2 change orders pending', impact: 'TBD', severity: 'medium' as const, action: 'Approve change orders' },
  ],
  estimateVsActual: {
    estimated: 31200,
    actual: 24580,
    variance: -6620,
    variancePercent: -21.2,
  },
  recentJobs: [
    { id: '1', user_id: '', name: 'Johnson Residence - Driveway', client_name: 'Mike Johnson', status: 'active' as const, estimated_revenue: 3200, actual_revenue: 2310, property_address: null, start_date: null, end_date: null, estimated_cost: null, actual_cost: null, created_at: '', updated_at: '' },
    { id: '2', user_id: '', name: 'ABC Corp Parking Lot', client_name: 'ABC Corporation', status: 'planned' as const, estimated_revenue: 12500, actual_revenue: 8300, property_address: null, start_date: null, end_date: null, estimated_cost: null, actual_cost: null, created_at: '', updated_at: '' },
    { id: '3', user_id: '', name: 'Smith Property Striping', client_name: 'Tom Smith', status: 'completed' as const, estimated_revenue: 1800, actual_revenue: 1180, property_address: null, start_date: null, end_date: null, estimated_cost: null, actual_cost: null, created_at: '', updated_at: '' },
  ],
  recentExpenses: [
    { id: '1', user_id: '', job_id: null, description: 'Construction materials', amount: 245.80, date: new Date().toISOString().split('T')[0], vendor: 'Home Depot', category_id: null, category_name: 'Materials', is_business: true, receipt_url: null, created_at: '' },
    { id: '2', user_id: '', job_id: null, description: 'Fuel', amount: 89.50, date: new Date(Date.now() - 86400000).toISOString().split('T')[0], vendor: 'Shell Gas Station', category_id: null, category_name: 'Fuel', is_business: true, receipt_url: null, created_at: '' },
    { id: '3', user_id: '', job_id: null, description: 'Equipment rental', amount: 156.20, date: new Date(Date.now() - 172800000).toISOString().split('T')[0], vendor: 'Lowes', category_id: null, category_name: 'Equipment', is_business: true, receipt_url: null, created_at: '' },
  ],
};

const actionIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  'Quotes awaiting approval': FileText,
  'Invoices overdue': AlertCircle,
  'Jobs over budget': AlertTriangle,
  'Expenses need job assignment': Receipt,
  'All caught up!': AlertCircle,
};

export default function DashboardPage() {
  const { user } = useAuth();
  const dashboardData = useDashboard(user?.id);

  // Determine if we're in demo mode (no real data yet)
  const isDemoMode = dashboardData.isLoading === false &&
    dashboardData.recentJobs.length === 0 &&
    dashboardData.stats.activeJobs === 0;

  // Use real data or fall back to demo data
  const data = isDemoMode ? {
    ...DEMO_DATA,
    isLoading: false,
    error: null,
  } : dashboardData;

  const quickActions = [
    { label: 'New Job', href: '/jobs/new', icon: Briefcase, color: 'bg-blue-600' },
    { label: 'New Estimate', href: '/jobs/estimate', icon: FileText, color: 'bg-purple-600' },
    { label: 'Add Expense', href: '/expenses/new', icon: Receipt, color: 'bg-green-600' },
    { label: 'New Invoice', href: '/books/invoice', icon: DollarSign, color: 'bg-orange-600' },
  ];

  let totalActionItems = 0;
  for (const item of data.actionItems) {
    totalActionItems += item.count;
  }

  // Calculate month-end forecast based on current trend
  const today = new Date();
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const dayOfMonth = today.getDate();
  const monthProgress = dayOfMonth / daysInMonth;

  // Project month-end based on current actual vs estimated ratio
  const currentRatio = data.estimateVsActual.estimated > 0
    ? data.estimateVsActual.actual / data.estimateVsActual.estimated
    : 1;
  // Forecast assumes current trend continues - blend current margin with projected
  const forecastedMargin = data.stats.profitMargin * (0.7 + (currentRatio * 0.3));

  // Format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(value);
  };

  // Format relative date
  const formatRelativeDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    return `${diffDays} days ago`;
  };

  // Stats configuration
  const stats = [
    {
      label: 'Active Jobs',
      value: data.stats.activeJobs.toString(),
      change: '+2',
      trend: 'up',
      icon: Briefcase,
      color: 'blue'
    },
    {
      label: 'Revenue (MTD)',
      value: formatCurrency(data.stats.revenueMonthToDate),
      change: `+${data.stats.revenueChange}%`,
      trend: 'up',
      icon: DollarSign,
      color: 'green'
    },
    {
      label: 'Profit Margin',
      value: `${data.stats.profitMargin}%`,
      change: `+${data.stats.profitMarginChange}%`,
      trend: 'up',
      icon: TrendingUp,
      color: 'purple'
    },
    {
      label: 'Quotes Pending',
      value: data.stats.quotesPending.toString(),
      change: formatCurrency(data.stats.quotesPendingValue),
      trend: 'up',
      icon: FileText,
      color: 'yellow'
    },
    {
      label: 'Open Leads',
      value: data.stats.openLeads.toString(),
      change: data.stats.leadsChange.toString(),
      trend: data.stats.leadsChange >= 0 ? 'up' : 'down',
      icon: Users,
      color: 'orange'
    },
  ];

  if (dashboardData.isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex items-center gap-3 text-gray-500">
          <RefreshCw className="w-5 h-5 animate-spin" />
          <span>Loading dashboard...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Demo Mode Banner */}
      {isDemoMode && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center gap-3">
          <Database className="w-5 h-5 text-blue-600" />
          <div className="flex-1">
            <p className="text-sm font-medium text-blue-900">Demo Mode</p>
            <p className="text-sm text-blue-700">
              Showing sample data. Create jobs, expenses, and invoices to see your real business metrics.
            </p>
          </div>
          <Link
            href="/jobs/new"
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700"
          >
            Create First Job
          </Link>
        </div>
      )}

      {/* Welcome */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Welcome back, {user?.user_metadata?.full_name?.split(' ')[0] || 'there'}!
          </h1>
          <p className="text-gray-600 mt-1">Here&apos;s what needs your attention today.</p>
        </div>
        {/* Quick Actions */}
        <div className="flex flex-wrap gap-2">
          {quickActions.map((action) => (
            <Link
              key={action.label}
              href={action.href}
              className={`${action.color} text-white px-3 py-2 rounded-lg font-medium flex items-center gap-2 hover:opacity-90 transition-opacity text-sm`}
            >
              <action.icon className="w-4 h-4" />
              {action.label}
            </Link>
          ))}
        </div>
      </div>

      {/* Action Required + Profit Risks Row */}
      <div className="grid lg:grid-cols-2 gap-4">
        {/* Action Required */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 bg-amber-50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
              <h2 className="font-semibold text-gray-900">Action Required</h2>
            </div>
            <span className="bg-amber-600 text-white text-xs font-bold px-2 py-1 rounded-full">
              {totalActionItems}
            </span>
          </div>
          <div className="divide-y divide-gray-100">
            {data.actionItems.map((item, i) => {
              const IconComponent = actionIcons[item.label] || AlertCircle;
              const actionHint = (item as { action?: string }).action;
              return (
                <Link
                  key={i}
                  href={item.href}
                  className="px-5 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      item.priority === 'high' ? 'bg-red-100' :
                      item.priority === 'medium' ? 'bg-amber-100' : 'bg-gray-100'
                    }`}>
                      <IconComponent className={`w-4 h-4 ${
                        item.priority === 'high' ? 'text-red-600' :
                        item.priority === 'medium' ? 'text-amber-600' : 'text-gray-600'
                      }`} />
                    </div>
                    <div>
                      <span className="text-gray-700">{item.label}</span>
                      {actionHint && (
                        <span className="hidden group-hover:inline text-blue-600 text-sm ml-2">
                          → {actionHint}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`font-semibold ${
                      item.priority === 'high' ? 'text-red-600' :
                      item.priority === 'medium' ? 'text-amber-600' : 'text-gray-600'
                    }`}>
                      {item.count}
                    </span>
                    <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-blue-600 transition-colors" />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Profit Risks */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 bg-red-50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-red-600" />
              <h2 className="font-semibold text-gray-900">Profit Risks</h2>
            </div>
            <span className="text-sm text-red-600 font-medium">
              {formatCurrency(Math.abs(data.estimateVsActual.variance))} at risk
            </span>
          </div>
          <div className="divide-y divide-gray-100">
            {data.profitRisks.length > 0 ? data.profitRisks.map((risk, i) => {
              const recommendedAction = (risk as { action?: string }).action;
              return (
                <Link
                  key={i}
                  href={`/jobs/${risk.jobId}`}
                  className="block px-5 py-3 hover:bg-gray-50 transition-colors group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="font-medium text-gray-900 text-sm">{risk.job}</p>
                      <p className="text-sm text-gray-500">{risk.issue}</p>
                      {recommendedAction && (
                        <p className="text-xs text-blue-600 mt-1 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <span className="font-medium">Recommended:</span> {recommendedAction}
                          <ChevronRight className="w-3 h-3" />
                        </p>
                      )}
                    </div>
                    <span className={`font-semibold ml-4 ${
                      risk.severity === 'high' ? 'text-red-600' : 'text-amber-600'
                    }`}>
                      {risk.impact}
                    </span>
                  </div>
                </Link>
              );
            }) : (
              <div className="px-5 py-6 text-center text-gray-500">
                <p className="text-sm">No profit risks detected</p>
                <p className="text-xs mt-1">All jobs are on track!</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-2">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center bg-${stat.color}-100`}>
                <stat.icon className={`w-4 h-4 text-${stat.color}-600`} />
              </div>
              <div className={`flex items-center gap-0.5 text-xs ${stat.trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
                {stat.trend === 'up' ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                {stat.change}
              </div>
            </div>
            <p className="text-xl font-bold text-gray-900">{stat.value}</p>
            <p className="text-xs text-gray-500">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Estimate vs Actual */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Target className="w-5 h-5 text-blue-600" />
            <h2 className="font-semibold text-gray-900">Estimated vs Actual Profit (MTD)</h2>
          </div>
          <Link href="/reports" className="text-sm text-blue-600 hover:text-blue-700 font-medium">
            View Details
          </Link>
        </div>
        <div className="grid md:grid-cols-5 gap-6">
          <div>
            <p className="text-sm text-gray-500 mb-1">Estimated Profit</p>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(data.estimateVsActual.estimated)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500 mb-1">Actual Profit</p>
            <p className="text-2xl font-bold text-blue-600">{formatCurrency(data.estimateVsActual.actual)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500 mb-1">Variance</p>
            <p className={`text-2xl font-bold ${data.estimateVsActual.variance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {data.estimateVsActual.variance >= 0 ? '+' : ''}{formatCurrency(data.estimateVsActual.variance)}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500 mb-1">Month-End Forecast</p>
            <p className={`text-2xl font-bold ${forecastedMargin >= data.stats.profitMargin ? 'text-green-600' : 'text-amber-600'}`}>
              {forecastedMargin.toFixed(1)}%
            </p>
            <p className="text-xs text-gray-400 mt-0.5">margin if trend continues</p>
          </div>
          <div>
            <p className="text-sm text-gray-500 mb-1">Performance</p>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full ${data.estimateVsActual.variancePercent >= 0 ? 'bg-green-500' : 'bg-red-500'}`}
                  style={{ width: `${Math.min(100, Math.max(0, (data.estimateVsActual.actual / data.estimateVsActual.estimated) * 100))}%` }}
                />
              </div>
              <span className={`text-sm font-semibold ${data.estimateVsActual.variancePercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {data.estimateVsActual.variancePercent}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent Jobs */}
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Recent Jobs</h2>
            <Link href="/jobs" className="text-sm text-blue-600 hover:text-blue-700 font-medium">
              View all
            </Link>
          </div>
          <div className="divide-y divide-gray-100">
            {data.recentJobs.map((job) => (
              <div key={job.id} className="px-5 py-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{job.name}</p>
                    <p className="text-sm text-gray-500">{job.client_name || 'No client'}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-gray-900">{formatCurrency(job.estimated_revenue || 0)}</p>
                    <p className="text-sm text-green-600">
                      +{formatCurrency((job.estimated_revenue || 0) - (job.actual_revenue || 0))}
                    </p>
                  </div>
                </div>
                <div className="mt-2">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                    job.status === 'completed' ? 'bg-green-100 text-green-700' :
                    job.status === 'active' ? 'bg-blue-100 text-blue-700' :
                    'bg-yellow-100 text-yellow-700'
                  }`}>
                    {job.status === 'active' ? 'In Progress' : job.status === 'planned' ? 'Scheduled' : 'Completed'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Expenses */}
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Recent Expenses</h2>
            <Link href="/expenses" className="text-sm text-blue-600 hover:text-blue-700 font-medium">
              View all
            </Link>
          </div>
          <div className="divide-y divide-gray-100">
            {data.recentExpenses.map((expense) => (
              <div key={expense.id} className="px-5 py-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{expense.vendor || expense.description}</p>
                    <p className="text-sm text-gray-500">{expense.category_name || 'Uncategorized'}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-gray-900">{formatCurrency(expense.amount)}</p>
                    <p className="text-sm text-gray-500 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatRelativeDate(expense.date)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Profit Tracking Banner */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold">Live Profit Tracking</h3>
            <p className="text-white/80 mt-1">
              See real-time margins on every job. Know what you&apos;re making, not just billing.
            </p>
          </div>
          <Link
            href="/reports"
            className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg font-medium transition-colors"
          >
            View Reports
          </Link>
        </div>
      </div>
    </div>
  );
}
