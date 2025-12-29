'use client';

import { useAuth } from '@/contexts/AuthContext';
import {
  Briefcase,
  DollarSign,
  TrendingUp,
  Users,
  Receipt,
  FileText,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  Clock
} from 'lucide-react';
import Link from 'next/link';

export default function DashboardPage() {
  const { user } = useAuth();

  const stats = [
    { label: 'Active Jobs', value: '12', change: '+2', trend: 'up', icon: Briefcase, color: 'blue' },
    { label: 'Revenue (MTD)', value: '$24,580', change: '+18%', trend: 'up', icon: DollarSign, color: 'green' },
    { label: 'Profit Margin', value: '34.2%', change: '+2.1%', trend: 'up', icon: TrendingUp, color: 'purple' },
    { label: 'Open Leads', value: '8', change: '-3', trend: 'down', icon: Users, color: 'orange' },
  ];

  const recentJobs = [
    { id: 1, name: 'Johnson Residence - Driveway', customer: 'Mike Johnson', status: 'In Progress', value: '$3,200', profit: '+$890' },
    { id: 2, name: 'ABC Corp Parking Lot', customer: 'ABC Corporation', status: 'Scheduled', value: '$12,500', profit: '+$4,200' },
    { id: 3, name: 'Smith Property Striping', customer: 'Tom Smith', status: 'Completed', value: '$1,800', profit: '+$620' },
  ];

  const recentExpenses = [
    { id: 1, vendor: 'Home Depot', amount: '$245.80', category: 'Materials', date: 'Today' },
    { id: 2, vendor: 'Shell Gas Station', amount: '$89.50', category: 'Fuel', date: 'Yesterday' },
    { id: 3, vendor: 'Lowes', amount: '$156.20', category: 'Equipment', date: '2 days ago' },
  ];

  const quickActions = [
    { label: 'New Job', href: '/jobs/new', icon: Briefcase, color: 'bg-blue-600' },
    { label: 'New Estimate', href: '/jobs/estimate', icon: FileText, color: 'bg-purple-600' },
    { label: 'Add Expense', href: '/expenses/new', icon: Receipt, color: 'bg-green-600' },
    { label: 'New Invoice', href: '/books/invoice', icon: DollarSign, color: 'bg-orange-600' },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome back, {user?.user_metadata?.full_name?.split(' ')[0] || 'there'}!
        </h1>
        <p className="text-gray-600 mt-1">Here&apos;s what&apos;s happening with your business today.</p>
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-3">
        {quickActions.map((action) => (
          <Link
            key={action.label}
            href={action.href}
            className={`${action.color} text-white px-4 py-2.5 rounded-lg font-medium flex items-center gap-2 hover:opacity-90 transition-opacity`}
          >
            <action.icon className="w-4 h-4" />
            {action.label}
          </Link>
        ))}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center bg-${stat.color}-100`}>
                <stat.icon className={`w-5 h-5 text-${stat.color}-600`} />
              </div>
              <div className={`flex items-center gap-1 text-sm ${stat.trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
                {stat.trend === 'up' ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                {stat.change}
              </div>
            </div>
            <div className="mt-3">
              <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              <p className="text-sm text-gray-500">{stat.label}</p>
            </div>
          </div>
        ))}
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
            {recentJobs.map((job) => (
              <div key={job.id} className="px-5 py-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{job.name}</p>
                    <p className="text-sm text-gray-500">{job.customer}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-gray-900">{job.value}</p>
                    <p className="text-sm text-green-600">{job.profit}</p>
                  </div>
                </div>
                <div className="mt-2">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                    job.status === 'Completed' ? 'bg-green-100 text-green-700' :
                    job.status === 'In Progress' ? 'bg-blue-100 text-blue-700' :
                    'bg-yellow-100 text-yellow-700'
                  }`}>
                    {job.status}
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
            {recentExpenses.map((expense) => (
              <div key={expense.id} className="px-5 py-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{expense.vendor}</p>
                    <p className="text-sm text-gray-500">{expense.category}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-gray-900">{expense.amount}</p>
                    <p className="text-sm text-gray-500 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {expense.date}
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
