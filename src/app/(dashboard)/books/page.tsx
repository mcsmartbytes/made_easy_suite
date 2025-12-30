'use client';

import { useState } from 'react';
import { Plus, Search, FileText, Clock, CheckCircle, AlertCircle, X, MoreVertical, Pencil, Trash2, Send, DollarSign } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useInvoices } from '@/hooks/useInvoices';
import { useJobs } from '@/hooks/useJobs';
import type { Invoice } from '@/types/database';

const statusConfig: Record<string, { bg: string; text: string; icon: React.ElementType }> = {
  draft: { bg: 'bg-gray-100', text: 'text-gray-700', icon: FileText },
  sent: { bg: 'bg-yellow-100', text: 'text-yellow-700', icon: Clock },
  paid: { bg: 'bg-green-100', text: 'text-green-700', icon: CheckCircle },
  overdue: { bg: 'bg-red-100', text: 'text-red-700', icon: AlertCircle },
  cancelled: { bg: 'bg-gray-100', text: 'text-gray-500', icon: FileText },
};

export default function BooksPage() {
  const { user } = useAuth();
  const { invoices, isLoading, createInvoice, updateInvoice, deleteInvoice, generateInvoiceNumber } = useInvoices(user?.id);
  const { jobs } = useJobs(user?.id);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    client_name: '',
    client_email: '',
    job_id: '',
    invoice_number: '',
    subtotal: '',
    tax_rate: '0',
    due_date: '',
    notes: '',
  });

  const resetForm = () => {
    setFormData({
      client_name: '',
      client_email: '',
      job_id: '',
      invoice_number: generateInvoiceNumber(),
      subtotal: '',
      tax_rate: '0',
      due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      notes: '',
    });
    setEditingInvoice(null);
  };

  const openNewModal = () => {
    resetForm();
    setShowModal(true);
  };

  const openEditModal = (invoice: Invoice) => {
    setEditingInvoice(invoice);
    setFormData({
      client_name: invoice.client_name || '',
      client_email: invoice.client_email || '',
      job_id: invoice.job_id || '',
      invoice_number: invoice.invoice_number,
      subtotal: invoice.subtotal.toString(),
      tax_rate: invoice.tax_rate.toString(),
      due_date: invoice.due_date || '',
      notes: invoice.notes || '',
    });
    setShowModal(true);
    setMenuOpen(null);
  };

  const calculateTotals = () => {
    const subtotal = parseFloat(formData.subtotal) || 0;
    const taxRate = parseFloat(formData.tax_rate) || 0;
    const taxAmount = subtotal * (taxRate / 100);
    const total = subtotal + taxAmount;
    return { subtotal, taxRate, taxAmount, total };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { subtotal, taxRate, taxAmount, total } = calculateTotals();

    const invoiceData = {
      client_name: formData.client_name || null,
      client_email: formData.client_email || null,
      job_id: formData.job_id || null,
      invoice_number: formData.invoice_number,
      subtotal,
      tax_rate: taxRate,
      tax_amount: taxAmount,
      total,
      due_date: formData.due_date || null,
      notes: formData.notes || null,
      status: 'draft' as const,
    };

    if (editingInvoice) {
      await updateInvoice(editingInvoice.id, invoiceData);
    } else {
      await createInvoice(invoiceData);
    }

    setShowModal(false);
    resetForm();
  };

  const handleStatusChange = async (id: string, newStatus: Invoice['status']) => {
    const updates: Partial<Invoice> = { status: newStatus };
    if (newStatus === 'sent' && !invoices.find(i => i.id === id)?.sent_at) {
      updates.sent_at = new Date().toISOString();
    }
    if (newStatus === 'paid') {
      updates.paid_at = new Date().toISOString();
    }
    await updateInvoice(id, updates);
    setMenuOpen(null);
  };

  const handleDelete = async (id: string) => {
    await deleteInvoice(id);
    setDeleteConfirm(null);
  };

  // Filter invoices
  const filteredInvoices = invoices.filter(inv => {
    const matchesSearch = !searchTerm ||
      inv.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.client_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || inv.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Calculate totals
  const totalPaid = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + i.total, 0);
  const totalPending = invoices.filter(i => i.status === 'sent').reduce((s, i) => s + i.total, 0);
  const totalOverdue = invoices.filter(i => i.status === 'overdue').reduce((s, i) => s + i.total, 0);

  const getStatusBadge = (status: string) => {
    const config = statusConfig[status] || statusConfig.draft;
    const Icon = config.icon;
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
        <Icon className="w-3 h-3" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Books</h1>
          <p className="text-gray-600">Invoices, payments, and financial tracking</p>
        </div>
        <button
          onClick={openNewModal}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg font-medium flex items-center gap-2"
        >
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
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalPaid)}</p>
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
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalPending)}</p>
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
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalOverdue)}</p>
              <p className="text-sm text-gray-500">Overdue</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search invoices..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Status</option>
          <option value="draft">Draft</option>
          <option value="sent">Sent</option>
          <option value="paid">Paid</option>
          <option value="overdue">Overdue</option>
        </select>
      </div>

      {/* Invoices Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {filteredInvoices.length === 0 ? (
          <div className="p-8 text-center">
            <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 mb-4">
              {searchTerm || statusFilter !== 'all'
                ? 'No invoices match your search criteria'
                : 'No invoices yet. Create your first invoice!'}
            </p>
            <button
              onClick={openNewModal}
              className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium"
            >
              <Plus className="w-4 h-4" /> Create Invoice
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">Invoice</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">Due</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-5 py-3 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
                  <th className="px-5 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredInvoices.map((invoice) => (
                  <tr key={invoice.id} className="hover:bg-gray-50">
                    <td className="px-5 py-4 font-medium text-blue-600">{invoice.invoice_number}</td>
                    <td className="px-5 py-4">
                      <p className="text-gray-900">{invoice.client_name || '—'}</p>
                      {invoice.client_email && (
                        <p className="text-sm text-gray-500">{invoice.client_email}</p>
                      )}
                    </td>
                    <td className="px-5 py-4 text-gray-600">
                      {new Date(invoice.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-4 text-gray-600">
                      {invoice.due_date ? new Date(invoice.due_date).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-5 py-4">{getStatusBadge(invoice.status)}</td>
                    <td className="px-5 py-4 text-right font-medium text-gray-900">
                      {formatCurrency(invoice.total)}
                    </td>
                    <td className="px-5 py-4 text-right relative">
                      <button
                        onClick={() => setMenuOpen(menuOpen === invoice.id ? null : invoice.id)}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        <MoreVertical className="w-4 h-4 text-gray-500" />
                      </button>
                      {menuOpen === invoice.id && (
                        <div className="absolute right-4 top-12 w-44 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10">
                          <button
                            onClick={() => openEditModal(invoice)}
                            className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 w-full"
                          >
                            <Pencil className="w-4 h-4" /> Edit
                          </button>
                          {invoice.status === 'draft' && (
                            <button
                              onClick={() => handleStatusChange(invoice.id, 'sent')}
                              className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 w-full"
                            >
                              <Send className="w-4 h-4" /> Mark as Sent
                            </button>
                          )}
                          {(invoice.status === 'sent' || invoice.status === 'overdue') && (
                            <button
                              onClick={() => handleStatusChange(invoice.id, 'paid')}
                              className="flex items-center gap-2 px-4 py-2 text-sm text-green-600 hover:bg-green-50 w-full"
                            >
                              <DollarSign className="w-4 h-4" /> Mark as Paid
                            </button>
                          )}
                          <div className="border-t border-gray-100 my-1"></div>
                          <button
                            onClick={() => {
                              setMenuOpen(null);
                              setDeleteConfirm(invoice.id);
                            }}
                            className="flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 w-full"
                          >
                            <Trash2 className="w-4 h-4" /> Delete
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                {editingInvoice ? 'Edit Invoice' : 'New Invoice'}
              </h2>
              <button
                onClick={() => { setShowModal(false); resetForm(); }}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Invoice Number</label>
                <input
                  type="text"
                  value={formData.invoice_number}
                  onChange={(e) => setFormData({ ...formData, invoice_number: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Client Name</label>
                  <input
                    type="text"
                    value={formData.client_name}
                    onChange={(e) => setFormData({ ...formData, client_name: e.target.value })}
                    placeholder="Client name"
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Client Email</label>
                  <input
                    type="email"
                    value={formData.client_email}
                    onChange={(e) => setFormData({ ...formData, client_email: e.target.value })}
                    placeholder="client@email.com"
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Job (Optional)</label>
                <select
                  value={formData.job_id}
                  onChange={(e) => setFormData({ ...formData, job_id: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">No job linked</option>
                  {jobs.map(job => (
                    <option key={job.id} value={job.id}>{job.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Subtotal <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                    <input
                      type="number"
                      value={formData.subtotal}
                      onChange={(e) => setFormData({ ...formData, subtotal: e.target.value })}
                      placeholder="0.00"
                      step="0.01"
                      min="0"
                      className="w-full pl-8 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tax Rate (%)</label>
                  <input
                    type="number"
                    value={formData.tax_rate}
                    onChange={(e) => setFormData({ ...formData, tax_rate: e.target.value })}
                    placeholder="0"
                    step="0.01"
                    min="0"
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Total Preview */}
              {parseFloat(formData.subtotal) > 0 && (
                <div className="p-4 bg-gray-50 rounded-lg space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Subtotal:</span>
                    <span className="text-gray-900">{formatCurrency(calculateTotals().subtotal)}</span>
                  </div>
                  {parseFloat(formData.tax_rate) > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Tax ({formData.tax_rate}%):</span>
                      <span className="text-gray-900">{formatCurrency(calculateTotals().taxAmount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-semibold border-t border-gray-200 pt-2">
                    <span className="text-gray-900">Total:</span>
                    <span className="text-gray-900">{formatCurrency(calculateTotals().total)}</span>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                <input
                  type="date"
                  value={formData.due_date}
                  onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Thank you for your business!"
                  rows={2}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => { setShowModal(false); resetForm(); }}
                  className="flex-1 px-4 py-2.5 text-gray-700 hover:bg-gray-100 rounded-lg font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg font-medium transition-colors"
                >
                  {editingInvoice ? 'Save Changes' : 'Create Invoice'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Invoice?</h3>
            <p className="text-gray-600 mb-4">
              Are you sure you want to delete this invoice? This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg font-medium"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {menuOpen && (
        <div className="fixed inset-0 z-0" onClick={() => setMenuOpen(null)} />
      )}
    </div>
  );
}
