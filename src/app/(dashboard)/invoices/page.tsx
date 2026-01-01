'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';

interface Invoice {
  id: string;
  invoice_number: string;
  customer_id: string;
  job_id: string | null;
  total: number;
  amount_paid: number;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  issue_date: string;
  due_date: string;
  client_name?: string;
  client_email?: string;
  customers?: {
    name: string;
    email: string;
  };
  jobs?: {
    job_number: string;
    name: string;
  };
}

// Demo invoices for presentation mode
const demoInvoices: Invoice[] = [
  {
    id: 'inv-1',
    invoice_number: 'INV-2024-047',
    customer_id: 'demo',
    job_id: 'demo-3',
    total: 125000,
    amount_paid: 125000,
    status: 'paid',
    issue_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    due_date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    client_name: 'Costco Wholesale',
    client_email: 'facilities@costco.com',
  },
  {
    id: 'inv-2',
    invoice_number: 'INV-2024-052',
    customer_id: 'demo',
    job_id: 'demo-1',
    total: 43750,
    amount_paid: 0,
    status: 'sent',
    issue_date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    due_date: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    client_name: 'Westfield Property Management',
    client_email: 'ap@westfield.com',
  },
  {
    id: 'inv-3',
    invoice_number: 'INV-2024-051',
    customer_id: 'demo',
    job_id: 'demo-5',
    total: 22500,
    amount_paid: 0,
    status: 'sent',
    issue_date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    due_date: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    client_name: 'Marriott International',
    client_email: 'facilities@marriott.com',
  },
  {
    id: 'inv-4',
    invoice_number: 'INV-2025-001',
    customer_id: 'demo',
    job_id: 'demo-2',
    total: 78000,
    amount_paid: 0,
    status: 'draft',
    issue_date: new Date().toISOString().split('T')[0],
    due_date: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    client_name: 'Chicago Dept of Aviation',
    client_email: 'contracts@flychicago.com',
  },
  {
    id: 'inv-5',
    invoice_number: 'INV-2025-002',
    customer_id: 'demo',
    job_id: 'demo-4',
    total: 34250,
    amount_paid: 0,
    status: 'draft',
    issue_date: new Date().toISOString().split('T')[0],
    due_date: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    client_name: 'Target Corporation',
    client_email: 'vendorpay@target.com',
  },
];

export default function InvoicesPage() {
  const { user } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isPresentationMode, setIsPresentationMode] = useState(false);

  useEffect(() => {
    // Check for presentation mode
    const demoMode = localStorage.getItem('presentationMode') === 'true';
    setIsPresentationMode(demoMode);

    if (demoMode) {
      setInvoices(demoInvoices);
      setLoading(false);
    } else if (user?.id) {
      loadInvoices();
    }
  }, [user?.id]);

  const loadInvoices = async () => {
    if (!user?.id) return;

    try {
      const res = await fetch(`/api/invoices?user_id=${user.id}`);
      const result = await res.json();

      if (result.success && result.data) {
        // Update status to overdue if past due date and not paid
        const today = new Date().toISOString().split('T')[0];
        const updatedInvoices = result.data.map((inv: Invoice) => {
          if ((inv.status === 'sent') && inv.due_date && inv.due_date < today) {
            return { ...inv, status: 'overdue' as const };
          }
          return inv;
        });
        setInvoices(updatedInvoices);
      }
    } catch (error) {
      console.error('Error loading invoices:', error);
    }
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
      sent: 'bg-blue-100 text-blue-700',
      paid: 'bg-green-100 text-green-700',
      overdue: 'bg-red-100 text-red-700',
      cancelled: 'bg-gray-100 text-gray-500',
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status] || styles.draft}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const filteredInvoices = invoices.filter(invoice => {
    const customerName = invoice.client_name || invoice.customers?.name || '';
    const jobData = invoice.jobs as { job_number: string; name: string } | null;

    const matchesSearch =
      (invoice.invoice_number || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (jobData?.name || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || invoice.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totals = {
    all: invoices.reduce((sum, i) => sum + (i.total || 0), 0),
    draft: invoices.filter(i => i.status === 'draft').reduce((sum, i) => sum + (i.total || 0), 0),
    sent: invoices.filter(i => i.status === 'sent').reduce((sum, i) => sum + ((i.total || 0) - (i.amount_paid || 0)), 0),
    overdue: invoices.filter(i => i.status === 'overdue').reduce((sum, i) => sum + ((i.total || 0) - (i.amount_paid || 0)), 0),
    paid: invoices.filter(i => i.status === 'paid').reduce((sum, i) => sum + (i.total || 0), 0),
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
          <h1 className="text-2xl font-bold text-corporate-dark">Invoices</h1>
          <p className="text-corporate-gray mt-1">Create and manage customer invoices</p>
        </div>
        <Link href="/dashboard/invoices/new" className="btn-primary flex items-center gap-2 justify-center">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Invoice
        </Link>
      </div>

      {/* Summary cards - clickable to filter */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <button
          onClick={() => setStatusFilter('all')}
          className={`stat-card text-left cursor-pointer transition-all ${statusFilter === 'all' ? 'ring-2 ring-primary-400' : 'hover:ring-2 hover:ring-primary-200'}`}
        >
          <p className="text-sm text-corporate-gray">Total</p>
          <p className="text-xl font-bold text-corporate-dark">{formatCurrency(totals.all)}</p>
          <p className="text-xs text-corporate-gray">{invoices.length} invoices</p>
        </button>
        <button
          onClick={() => setStatusFilter('sent')}
          className={`stat-card text-left cursor-pointer transition-all ${statusFilter === 'sent' ? 'ring-2 ring-blue-400' : 'hover:ring-2 hover:ring-blue-200'}`}
        >
          <p className="text-sm text-corporate-gray">Outstanding</p>
          <p className="text-xl font-bold text-blue-600">{formatCurrency(totals.sent)}</p>
          <p className="text-xs text-corporate-gray">{invoices.filter(i => i.status === 'sent').length} sent</p>
        </button>
        <button
          onClick={() => setStatusFilter('overdue')}
          className={`stat-card text-left cursor-pointer transition-all ${statusFilter === 'overdue' ? 'ring-2 ring-red-400' : 'hover:ring-2 hover:ring-red-200'}`}
        >
          <p className="text-sm text-corporate-gray">Overdue</p>
          <p className="text-xl font-bold text-red-600">{formatCurrency(totals.overdue)}</p>
          <p className="text-xs text-corporate-gray">{invoices.filter(i => i.status === 'overdue').length} overdue</p>
        </button>
        <button
          onClick={() => setStatusFilter('paid')}
          className={`stat-card text-left cursor-pointer transition-all ${statusFilter === 'paid' ? 'ring-2 ring-green-400' : 'hover:ring-2 hover:ring-green-200'}`}
        >
          <p className="text-sm text-corporate-gray">Collected</p>
          <p className="text-xl font-bold text-green-600">{formatCurrency(totals.paid)}</p>
          <p className="text-xs text-corporate-gray">{invoices.filter(i => i.status === 'paid').length} paid</p>
        </button>
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
              placeholder="Search invoices, customers, or jobs..."
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
            <option value="sent">Sent</option>
            <option value="paid">Paid</option>
            <option value="overdue">Overdue</option>
          </select>
        </div>
      </div>

      {/* Invoices table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Invoice</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Customer</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider hidden lg:table-cell">Issued</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Due</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                <th className="px-3 py-2 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Amount</th>
                <th className="px-3 py-2 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider w-20">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-corporate-gray">
                    {invoices.length === 0 ? (
                      <div>
                        <p className="mb-2">No invoices yet</p>
                        <Link href="/dashboard/invoices/new" className="text-primary-600 hover:underline">
                          Create your first invoice
                        </Link>
                      </div>
                    ) : (
                      'No invoices match your search'
                    )}
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((invoice) => {
                  const customerName = invoice.client_name || invoice.customers?.name || 'Unknown';

                  return (
                    <tr key={invoice.id} className="hover:bg-gray-50">
                      <td className="px-3 py-2">
                        <Link href={`/dashboard/invoices/${invoice.id}`} className="font-medium text-primary-600 hover:text-primary-700 text-xs">
                          {invoice.invoice_number}
                        </Link>
                      </td>
                      <td className="px-3 py-2">
                        <p className="font-medium text-corporate-dark text-xs truncate max-w-[180px]">{customerName}</p>
                      </td>
                      <td className="px-3 py-2 text-xs text-gray-500 hidden lg:table-cell">
                        {new Date(invoice.issue_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </td>
                      <td className="px-3 py-2 text-xs text-gray-500">
                        {new Date(invoice.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </td>
                      <td className="px-3 py-2">{getStatusBadge(invoice.status)}</td>
                      <td className="px-3 py-2 text-right font-semibold text-corporate-dark text-xs">
                        {formatCurrency(invoice.total || 0)}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Link
                            href={`/dashboard/invoices/${invoice.id}`}
                            className="p-1.5 text-corporate-gray hover:text-primary-600 hover:bg-primary-50 rounded transition-colors"
                            title="View"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          </Link>
                          {invoice.status === 'draft' && (
                            <button
                              className="p-1.5 text-corporate-gray hover:text-green-600 hover:bg-green-50 rounded transition-colors"
                              title="Send"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                              </svg>
                            </button>
                          )}
                          {(invoice.status === 'sent' || invoice.status === 'overdue') && (
                            <Link
                              href={`/dashboard/payments/receive?invoice=${invoice.id}`}
                              className="p-1.5 text-corporate-gray hover:text-green-600 hover:bg-green-50 rounded transition-colors"
                              title="Record Payment"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            </Link>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
