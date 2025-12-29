'use client';

import { useState } from 'react';
import { Plus, Search, FileText, DollarSign, Clock, CheckCircle, AlertCircle } from 'lucide-react';

export default function BooksPage() {
  const [view, setView] = useState<'invoices' | 'payments'>('invoices');

  const invoices = [
    { id: 'INV-001', customer: 'Mike Johnson', job: 'Driveway Seal', amount: 3200, status: 'paid', date: '2024-12-20', paidDate: '2024-12-22' },
    { id: 'INV-002', customer: 'ABC Corporation', job: 'Parking Lot Phase 1', amount: 6500, status: 'pending', date: '2024-12-25', dueDate: '2025-01-25' },
    { id: 'INV-003', customer: 'Tom Smith', job: 'Striping', amount: 1800, status: 'overdue', date: '2024-12-01', dueDate: '2024-12-15' },
    { id: 'INV-004', customer: 'City Mall LLC', job: 'Section B Repair', amount: 8500, status: 'draft', date: '2024-12-28' },
  ];

  const getStatusBadge = (status: string) => {
    const styles: Record<string, { bg: string, text: string, icon: any }> = {
      paid: { bg: 'bg-green-100', text: 'text-green-700', icon: CheckCircle },
      pending: { bg: 'bg-yellow-100', text: 'text-yellow-700', icon: Clock },
      overdue: { bg: 'bg-red-100', text: 'text-red-700', icon: AlertCircle },
      draft: { bg: 'bg-gray-100', text: 'text-gray-700', icon: FileText },
    };
    const style = styles[status];
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${style.bg} ${style.text}`}>
        <style.icon className="w-3 h-3" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const totalPaid = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + i.amount, 0);
  const totalPending = invoices.filter(i => i.status === 'pending').reduce((s, i) => s + i.amount, 0);
  const totalOverdue = invoices.filter(i => i.status === 'overdue').reduce((s, i) => s + i.amount, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Books</h1>
          <p className="text-gray-600">Invoices, payments, and financial tracking</p>
        </div>
        <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg font-medium flex items-center gap-2">
          <Plus className="w-4 h-4" /> New Invoice
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">${totalPaid.toLocaleString()}</p>
              <p className="text-sm text-gray-500">Paid (MTD)</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
              <Clock className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">${totalPending.toLocaleString()}</p>
              <p className="text-sm text-gray-500">Pending</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">${totalOverdue.toLocaleString()}</p>
              <p className="text-sm text-gray-500">Overdue</p>
            </div>
          </div>
        </div>
      </div>

      {/* Invoices Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" placeholder="Search invoices..." className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg" />
          </div>
        </div>
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">Invoice</th>
              <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
              <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">Job</th>
              <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
              <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-5 py-3 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {invoices.map((invoice) => (
              <tr key={invoice.id} className="hover:bg-gray-50 cursor-pointer">
                <td className="px-5 py-4 font-medium text-blue-600">{invoice.id}</td>
                <td className="px-5 py-4 text-gray-900">{invoice.customer}</td>
                <td className="px-5 py-4 text-gray-600">{invoice.job}</td>
                <td className="px-5 py-4 text-gray-600">{new Date(invoice.date).toLocaleDateString()}</td>
                <td className="px-5 py-4">{getStatusBadge(invoice.status)}</td>
                <td className="px-5 py-4 text-right font-medium text-gray-900">${invoice.amount.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
