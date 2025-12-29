'use client';

import { useState } from 'react';
import { Plus, Search, Camera, Car, Receipt, Filter, Download } from 'lucide-react';

export default function ExpensesPage() {
  const [view, setView] = useState<'expenses' | 'mileage'>('expenses');

  const expenses = [
    { id: 1, vendor: 'Home Depot', amount: 245.80, category: 'Materials', date: '2024-12-28', job: 'Johnson Residence', receipt: true },
    { id: 2, vendor: 'Shell Gas Station', amount: 89.50, category: 'Fuel', date: '2024-12-27', job: null, receipt: true },
    { id: 3, vendor: 'Lowes', amount: 156.20, category: 'Equipment', date: '2024-12-26', job: 'ABC Corp', receipt: false },
    { id: 4, vendor: 'Sherwin Williams', amount: 432.00, category: 'Materials', date: '2024-12-25', job: 'City Mall', receipt: true },
    { id: 5, vendor: 'Amazon', amount: 67.99, category: 'Supplies', date: '2024-12-24', job: null, receipt: true },
  ];

  const mileageTrips = [
    { id: 1, from: 'Office', to: 'Johnson Residence', miles: 12.4, date: '2024-12-28', job: 'Johnson Residence', deduction: 8.31 },
    { id: 2, from: 'Johnson Residence', to: 'Home Depot', miles: 5.2, date: '2024-12-28', job: 'Johnson Residence', deduction: 3.48 },
    { id: 3, from: 'Office', to: 'ABC Corp', miles: 22.8, date: '2024-12-27', job: 'ABC Corp', deduction: 15.28 },
  ];

  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  const totalMiles = mileageTrips.reduce((sum, m) => sum + m.miles, 0);
  const totalDeduction = mileageTrips.reduce((sum, m) => sum + m.deduction, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Expenses</h1>
          <p className="text-gray-600">Track expenses and mileage for tax deductions</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="border border-gray-200 hover:bg-gray-50 text-gray-700 px-4 py-2.5 rounded-lg font-medium flex items-center gap-2">
            <Download className="w-4 h-4" /> Export
          </button>
          <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg font-medium flex items-center gap-2">
            <Plus className="w-4 h-4" /> Add {view === 'expenses' ? 'Expense' : 'Trip'}
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
              <Receipt className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">${totalExpenses.toLocaleString()}</p>
              <p className="text-sm text-gray-500">Total Expenses (MTD)</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Car className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{totalMiles.toFixed(1)} mi</p>
              <p className="text-sm text-gray-500">Miles Tracked (MTD)</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <Camera className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">${totalDeduction.toFixed(2)}</p>
              <p className="text-sm text-gray-500">Mileage Deduction @ $0.67/mi</p>
            </div>
          </div>
        </div>
      </div>

      {/* Toggle */}
      <div className="flex items-center gap-4">
        <div className="flex bg-gray-100 p-1 rounded-lg">
          <button
            onClick={() => setView('expenses')}
            className={`px-4 py-1.5 rounded-md text-sm font-medium flex items-center gap-2 ${view === 'expenses' ? 'bg-white shadow-sm' : ''}`}
          >
            <Receipt className="w-4 h-4" /> Expenses
          </button>
          <button
            onClick={() => setView('mileage')}
            className={`px-4 py-1.5 rounded-md text-sm font-medium flex items-center gap-2 ${view === 'mileage' ? 'bg-white shadow-sm' : ''}`}
          >
            <Car className="w-4 h-4" /> Mileage
          </button>
        </div>
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" placeholder="Search..." className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg" />
        </div>
      </div>

      {view === 'expenses' ? (
        /* Expenses Table */
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vendor</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">Job</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">Receipt</th>
                <th className="px-5 py-3 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {expenses.map((expense) => (
                <tr key={expense.id} className="hover:bg-gray-50 cursor-pointer">
                  <td className="px-5 py-4 text-gray-600">{new Date(expense.date).toLocaleDateString()}</td>
                  <td className="px-5 py-4 font-medium text-gray-900">{expense.vendor}</td>
                  <td className="px-5 py-4">
                    <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded-full text-xs font-medium">
                      {expense.category}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-gray-600">{expense.job || '—'}</td>
                  <td className="px-5 py-4">
                    {expense.receipt ? (
                      <span className="text-green-600">✓</span>
                    ) : (
                      <button className="text-blue-600 text-sm hover:underline">Add</button>
                    )}
                  </td>
                  <td className="px-5 py-4 text-right font-medium text-gray-900">${expense.amount.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        /* Mileage Table */
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">Trip</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">Job</th>
                <th className="px-5 py-3 text-right text-xs font-medium text-gray-500 uppercase">Miles</th>
                <th className="px-5 py-3 text-right text-xs font-medium text-gray-500 uppercase">Deduction</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {mileageTrips.map((trip) => (
                <tr key={trip.id} className="hover:bg-gray-50 cursor-pointer">
                  <td className="px-5 py-4 text-gray-600">{new Date(trip.date).toLocaleDateString()}</td>
                  <td className="px-5 py-4 font-medium text-gray-900">{trip.from} → {trip.to}</td>
                  <td className="px-5 py-4 text-gray-600">{trip.job}</td>
                  <td className="px-5 py-4 text-right text-gray-900">{trip.miles.toFixed(1)}</td>
                  <td className="px-5 py-4 text-right font-medium text-green-600">${trip.deduction.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
