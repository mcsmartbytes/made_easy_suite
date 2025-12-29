'use client';

import { BarChart3, TrendingUp, DollarSign, Briefcase, Calendar } from 'lucide-react';

export default function ReportsPage() {
  const monthlyData = [
    { month: 'Jul', revenue: 18500, expenses: 12200, profit: 6300 },
    { month: 'Aug', revenue: 22000, expenses: 14500, profit: 7500 },
    { month: 'Sep', revenue: 19800, expenses: 13100, profit: 6700 },
    { month: 'Oct', revenue: 28500, expenses: 18200, profit: 10300 },
    { month: 'Nov', revenue: 24200, expenses: 15800, profit: 8400 },
    { month: 'Dec', revenue: 24580, expenses: 16120, profit: 8460 },
  ];

  const topJobs = [
    { name: 'ABC Corp Parking Lot', revenue: 12500, profit: 4200, margin: 33.6 },
    { name: 'City Mall Section B', revenue: 8500, profit: 2890, margin: 34.0 },
    { name: 'Johnson Residence', revenue: 3200, profit: 890, margin: 27.8 },
  ];

  const expenseBreakdown = [
    { category: 'Materials', amount: 6200, percent: 38.5 },
    { category: 'Labor', amount: 4800, percent: 29.8 },
    { category: 'Fuel', amount: 2100, percent: 13.0 },
    { category: 'Equipment', amount: 1800, percent: 11.2 },
    { category: 'Other', amount: 1220, percent: 7.5 },
  ];

  const totalRevenue = monthlyData.reduce((s, m) => s + m.revenue, 0);
  const totalExpenses = monthlyData.reduce((s, m) => s + m.expenses, 0);
  const totalProfit = monthlyData.reduce((s, m) => s + m.profit, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
          <p className="text-gray-600">Financial overview and business analytics</p>
        </div>
        <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-lg">
          <button className="px-3 py-1.5 bg-white rounded-md text-sm font-medium shadow-sm">6 Months</button>
          <button className="px-3 py-1.5 text-sm font-medium text-gray-600">Year</button>
          <button className="px-3 py-1.5 text-sm font-medium text-gray-600">All Time</button>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">${(totalRevenue / 1000).toFixed(1)}K</p>
              <p className="text-sm text-gray-500">Total Revenue</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">${(totalExpenses / 1000).toFixed(1)}K</p>
              <p className="text-sm text-gray-500">Total Expenses</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">${(totalProfit / 1000).toFixed(1)}K</p>
              <p className="text-sm text-gray-500">Net Profit</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <Briefcase className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{Math.round((totalProfit / totalRevenue) * 100)}%</p>
              <p className="text-sm text-gray-500">Profit Margin</p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Revenue Chart */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Monthly Revenue vs Expenses</h2>
          <div className="space-y-3">
            {monthlyData.map((month) => (
              <div key={month.month} className="flex items-center gap-4">
                <span className="w-8 text-sm text-gray-500">{month.month}</span>
                <div className="flex-1 flex items-center gap-2">
                  <div className="flex-1 h-6 bg-gray-100 rounded-full overflow-hidden flex">
                    <div
                      className="h-full bg-blue-500"
                      style={{ width: `${(month.revenue / 30000) * 100}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium w-16 text-right">${(month.revenue / 1000).toFixed(1)}K</span>
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
          <h2 className="font-semibold text-gray-900 mb-4">Expense Breakdown</h2>
          <div className="space-y-4">
            {expenseBreakdown.map((expense) => (
              <div key={expense.category}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600">{expense.category}</span>
                  <span className="font-medium text-gray-900">${expense.amount.toLocaleString()}</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500"
                    style={{ width: `${expense.percent}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top Jobs */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Top Performing Jobs</h2>
        </div>
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Job</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Revenue</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Profit</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Margin</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {topJobs.map((job, i) => (
              <tr key={i} className="hover:bg-gray-50">
                <td className="px-6 py-4 font-medium text-gray-900">{job.name}</td>
                <td className="px-6 py-4 text-right text-gray-900">${job.revenue.toLocaleString()}</td>
                <td className="px-6 py-4 text-right text-green-600 font-medium">${job.profit.toLocaleString()}</td>
                <td className="px-6 py-4 text-right">
                  <span className="bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs font-medium">
                    {job.margin}%
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
