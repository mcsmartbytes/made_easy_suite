'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/utils/supabase';

interface Bill {
  id: string;
  bill_number: string;
  vendor_name: string;
  vendor_email: string;
  amount: number;
  status: 'draft' | 'unpaid' | 'paid' | 'overdue';
  bill_date: string;
  due_date: string;
  category: string;
}

export default function BillsPage() {
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    loadBills();
  }, []);

  const loadBills = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    // Mock data
    const mockBills: Bill[] = [
      { id: '1', bill_number: 'BILL-001', vendor_name: 'Office Supplies Co', vendor_email: 'orders@officesupplies.com', amount: 450.00, status: 'unpaid', bill_date: '2024-12-01', due_date: '2024-12-15', category: 'Office Expenses' },
      { id: '2', bill_number: 'BILL-002', vendor_name: 'Cloud Services Inc', vendor_email: 'billing@cloudservices.com', amount: 1200.00, status: 'unpaid', bill_date: '2024-11-25', due_date: '2024-12-10', category: 'Software' },
      { id: '3', bill_number: 'BILL-003', vendor_name: 'Marketing Agency Pro', vendor_email: 'accounts@marketingpro.com', amount: 5500.00, status: 'overdue', bill_date: '2024-11-01', due_date: '2024-11-15', category: 'Marketing' },
      { id: '4', bill_number: 'BILL-004', vendor_name: 'Insurance Partners', vendor_email: 'premiums@insurancepartners.com', amount: 2800.00, status: 'paid', bill_date: '2024-11-20', due_date: '2024-12-05', category: 'Insurance' },
      { id: '5', bill_number: 'BILL-005', vendor_name: 'Utility Company', vendor_email: 'business@utilityco.com', amount: 350.00, status: 'draft', bill_date: '2024-12-02', due_date: '2024-12-20', category: 'Utilities' },
    ];
    setBills(mockBills);
    setLoading(false);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      draft: 'bg-gray-100 text-gray-700',
      unpaid: 'bg-orange-100 text-orange-700',
      paid: 'bg-green-100 text-green-700',
      overdue: 'bg-red-100 text-red-700',
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status]}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const filteredBills = bills.filter(bill => {
    const matchesSearch = bill.bill_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      bill.vendor_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || bill.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totals = {
    all: bills.reduce((sum, b) => sum + b.amount, 0),
    unpaid: bills.filter(b => b.status === 'unpaid').reduce((sum, b) => sum + b.amount, 0),
    overdue: bills.filter(b => b.status === 'overdue').reduce((sum, b) => sum + b.amount, 0),
    paid: bills.filter(b => b.status === 'paid').reduce((sum, b) => sum + b.amount, 0),
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-corporate-dark">Bills</h1>
          <p className="text-corporate-gray mt-1">Track and pay vendor bills</p>
        </div>
        <Link href="/dashboard/bills/new" className="btn-primary flex items-center gap-2 justify-center">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Bill
        </Link>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="stat-card cursor-pointer hover:ring-2 hover:ring-primary-200" onClick={() => setStatusFilter('all')}>
          <p className="text-sm text-corporate-gray">Total Bills</p>
          <p className="text-xl font-bold text-corporate-dark">{formatCurrency(totals.all)}</p>
          <p className="text-xs text-corporate-gray">{bills.length} bills</p>
        </div>
        <div className="stat-card cursor-pointer hover:ring-2 hover:ring-orange-200" onClick={() => setStatusFilter('unpaid')}>
          <p className="text-sm text-corporate-gray">Unpaid</p>
          <p className="text-xl font-bold text-orange-600">{formatCurrency(totals.unpaid)}</p>
          <p className="text-xs text-corporate-gray">{bills.filter(b => b.status === 'unpaid').length} bills</p>
        </div>
        <div className="stat-card cursor-pointer hover:ring-2 hover:ring-red-200" onClick={() => setStatusFilter('overdue')}>
          <p className="text-sm text-corporate-gray">Overdue</p>
          <p className="text-xl font-bold text-red-600">{formatCurrency(totals.overdue)}</p>
          <p className="text-xs text-corporate-gray">{bills.filter(b => b.status === 'overdue').length} bills</p>
        </div>
        <div className="stat-card cursor-pointer hover:ring-2 hover:ring-green-200" onClick={() => setStatusFilter('paid')}>
          <p className="text-sm text-corporate-gray">Paid</p>
          <p className="text-xl font-bold text-green-600">{formatCurrency(totals.paid)}</p>
          <p className="text-xs text-corporate-gray">{bills.filter(b => b.status === 'paid').length} bills</p>
        </div>
      </div>

      {/* Search and filters */}
      <div className="card">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-corporate-gray" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search bills..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-field pl-10"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="input-field w-auto"
          >
            <option value="all">All Status</option>
            <option value="draft">Draft</option>
            <option value="unpaid">Unpaid</option>
            <option value="paid">Paid</option>
            <option value="overdue">Overdue</option>
          </select>
        </div>
      </div>

      {/* Bills table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Bill #</th>
                <th>Vendor</th>
                <th>Category</th>
                <th>Bill Date</th>
                <th>Due Date</th>
                <th>Status</th>
                <th className="text-right">Amount</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredBills.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-corporate-gray">
                    No bills found
                  </td>
                </tr>
              ) : (
                filteredBills.map((bill) => (
                  <tr key={bill.id}>
                    <td>
                      <Link href={`/dashboard/bills/${bill.id}`} className="font-medium text-primary-600 hover:text-primary-700">
                        {bill.bill_number}
                      </Link>
                    </td>
                    <td>
                      <p className="font-medium text-corporate-dark">{bill.vendor_name}</p>
                      <p className="text-xs text-corporate-gray">{bill.vendor_email}</p>
                    </td>
                    <td>
                      <span className="px-2 py-1 bg-gray-100 rounded text-xs text-corporate-slate">
                        {bill.category}
                      </span>
                    </td>
                    <td className="text-corporate-slate">
                      {new Date(bill.bill_date).toLocaleDateString()}
                    </td>
                    <td className="text-corporate-slate">
                      {new Date(bill.due_date).toLocaleDateString()}
                    </td>
                    <td>{getStatusBadge(bill.status)}</td>
                    <td className="text-right font-semibold text-corporate-dark">
                      {formatCurrency(bill.amount)}
                    </td>
                    <td className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/dashboard/bills/${bill.id}`}
                          className="p-2 text-corporate-gray hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                          title="View"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </Link>
                        {(bill.status === 'unpaid' || bill.status === 'overdue') && (
                          <button
                            className="p-2 text-corporate-gray hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                            title="Pay Bill"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          </button>
                        )}
                        <button
                          className="p-2 text-corporate-gray hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
