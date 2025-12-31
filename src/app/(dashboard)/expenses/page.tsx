'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import LearningPromptModal from '@/components/LearningPromptModal';
import { supabase } from '@/utils/supabase';
import { useAuth } from '@/contexts/AuthContext';
import {
  detectCorrection,
  buildLearningSuggestion,
  shouldShowLearningPrompt,
  LearningSuggestion,
} from '@/lib/learningDetection';

interface Expense {
  id: string;
  amount: number;
  description: string;
  date: string;
  vendor: string | null;
  is_business: boolean;
  payment_method?: string;
  notes?: string;
  category_id?: string;
  category: {
    name: string;
    icon: string;
    color: string;
  } | null;
  job_id?: string | null;
  job_name?: string | null;
  po_number?: string | null;
}

interface Category {
  id: string;
  name: string;
  color: string;
  icon: string;
}

interface Job {
  id: string;
  name: string;
}

export default function ExpensesPage() {
  const { user } = useAuth();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<'all' | 'business' | 'personal'>('all');
  const [dateRange, setDateRange] = useState<'all' | 'month' | 'quarter' | 'year'>('all');
  const [jobFilterId, setJobFilterId] = useState<string>('');
  const [query, setQuery] = useState('');

  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [editFormData, setEditFormData] = useState({
    amount: '',
    description: '',
    category_id: '',
    date: '',
    vendor: '',
    payment_method: 'credit',
    is_business: true,
    notes: '',
    job_id: '',
  });
  const [saving, setSaving] = useState(false);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [newCategory, setNewCategory] = useState({
    name: '',
    icon: '📁',
    color: '#6366F1',
    deduction_percentage: 0,
  });
  const [creatingCategory, setCreatingCategory] = useState(false);

  // Learning system state
  const [originalExpenseValues, setOriginalExpenseValues] = useState<{
    category_id?: string | null;
    is_business?: boolean;
    vendor?: string | null;
  } | null>(null);
  const [showLearningModal, setShowLearningModal] = useState(false);
  const [learningSuggestion, setLearningSuggestion] = useState<LearningSuggestion | null>(null);
  const userId = user?.id || null;

  useEffect(() => {
    if (user?.id) {
      loadExpenses();
      loadCategories();
      loadJobs();
    }
  }, [user?.id]);

  async function loadCategories() {
    try {
      const response = await fetch('/api/categories');
      const result = await response.json();
      if (result.success && result.data) {
        setCategories(result.data);
      }
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  }

  async function handleCreateCategory() {
    if (!newCategory.name.trim()) {
      alert('Please enter a category name');
      return;
    }

    setCreatingCategory(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        alert('Please sign in');
        return;
      }

      const response = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          categories: [{
            name: newCategory.name.trim(),
            icon: newCategory.icon,
            color: newCategory.color,
            deduction_percentage: newCategory.deduction_percentage,
            is_tax_deductible: newCategory.deduction_percentage > 0,
          }],
          user_id: user.id,
        }),
      });

      const result = await response.json();
      if (result.success && result.data && result.data.length > 0) {
        const createdCategory = result.data[0];
        setCategories(prev => [...prev, createdCategory]);
        setEditFormData(prev => ({ ...prev, category_id: createdCategory.id }));
        setNewCategory({ name: '', icon: '📁', color: '#6366F1', deduction_percentage: 0 });
        setShowAddCategory(false);
      } else {
        alert('Failed to create category: ' + (result.error || 'Unknown error'));
      }
    } catch (error: any) {
      alert('Error creating category: ' + error.message);
    } finally {
      setCreatingCategory(false);
    }
  }

  async function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingExpense) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('expenses')
        .update({
          amount: parseFloat(editFormData.amount || '0'),
          description: editFormData.description,
          category_id: editFormData.category_id || null,
          date: editFormData.date,
          vendor: editFormData.vendor || null,
          payment_method: editFormData.payment_method || null,
          is_business: editFormData.is_business,
          notes: editFormData.notes || null,
          job_id: editFormData.job_id || null,
        })
        .eq('id', editingExpense.id);
      if (error) throw error;

      // Update local state
      const updatedCategory = categories.find(c => c.id === editFormData.category_id);
      setExpenses(prev => prev.map(e => e.id === editingExpense.id ? {
        ...e,
        amount: parseFloat(editFormData.amount || '0'),
        description: editFormData.description,
        category_id: editFormData.category_id || undefined,
        category: updatedCategory ? { name: updatedCategory.name, icon: updatedCategory.icon, color: updatedCategory.color } : null,
        date: editFormData.date,
        vendor: editFormData.vendor || null,
        payment_method: editFormData.payment_method || undefined,
        is_business: editFormData.is_business,
        notes: editFormData.notes || undefined,
        job_id: editFormData.job_id || null,
      } : e));

      // Check for learning opportunity
      if (originalExpenseValues && editFormData.vendor) {
        const correction = detectCorrection(
          originalExpenseValues,
          {
            category_id: editFormData.category_id || null,
            is_business: editFormData.is_business,
            vendor: editFormData.vendor,
          },
          categories
        );

        if (correction && shouldShowLearningPrompt(editFormData.vendor, 'vendor')) {
          const suggestion = buildLearningSuggestion(correction);
          setLearningSuggestion(suggestion);
          setShowLearningModal(true);
        }
      }

      setEditingExpense(null);
      setOriginalExpenseValues(null);
    } catch (err) {
      alert('Failed to save changes');
    } finally {
      setSaving(false);
    }
  }

  async function loadJobs() {
    if (!user?.id) return;
    try {
      const res = await fetch(`/api/jobs?user_id=${user.id}`);
      const result = await res.json();
      if (result.success && result.data) {
        setJobs(result.data.map((j: any) => ({ id: j.id, name: j.name })));
      }
    } catch (error) {
      console.error('Error loading jobs:', error);
    }
  }

  async function loadExpenses() {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`/api/expenses?user_id=${user.id}`);
      const result = await res.json();

      if (result.success && result.data) {
        const formattedExpenses: Expense[] = result.data.map((exp: any) => ({
          id: exp.id,
          amount: exp.amount,
          description: exp.description,
          date: exp.date,
          vendor: exp.vendor,
          is_business: exp.is_business,
          payment_method: exp.payment_method,
          notes: exp.notes,
          category_id: exp.category_id,
          po_number: exp.po_number ?? null,
          job_id: exp.job_id,
          category: exp.category_name ? {
            name: exp.category_name,
            icon: exp.category_icon || '📁',
            color: exp.category_color || '#6366F1',
          } : null,
          job_name: exp.job_name ?? null,
        }));
        setExpenses(formattedExpenses);
      }
    } catch (error) {
      console.error('Error loading expenses:', error);
    } finally {
      setLoading(false);
    }
  }

  async function deleteExpense(id: string) {
    if (!confirm('Delete this expense?')) return;
    try {
      const { error } = await supabase.from('expenses').delete().eq('id', id);
      if (error) throw error;
      setExpenses(prev => prev.filter(e => e.id !== id));
    } catch (err) {
      alert('Failed to delete expense');
      // no-op
    }
  }

  function getFilteredExpenses() {
    let filtered = expenses;
    if (filterType === 'business') filtered = filtered.filter(e => e.is_business);
    else if (filterType === 'personal') filtered = filtered.filter(e => !e.is_business);

    const now = new Date();
    if (dateRange === 'month') {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      filtered = filtered.filter(e => new Date(e.date) >= startOfMonth);
    } else if (dateRange === 'quarter') {
      const startOfQuarter = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
      filtered = filtered.filter(e => new Date(e.date) >= startOfQuarter);
    } else if (dateRange === 'year') {
      const startOfYear = new Date(now.getFullYear(), 0, 1);
      filtered = filtered.filter(e => new Date(e.date) >= startOfYear);
    }

    if (jobFilterId) {
      filtered = filtered.filter(e => e.job_id === jobFilterId);
    }

    const q = query.trim().toLowerCase();
    if (q) {
      filtered = filtered.filter(e =>
        (e.description || '').toLowerCase().includes(q) ||
        (e.vendor || '').toLowerCase().includes(q) ||
        (e.po_number || '').toLowerCase().includes(q)
      );
    }

    return filtered;
  }

  function exportToCSV() {
    const filteredExpenses = getFilteredExpenses();
    if (filteredExpenses.length === 0) {
      alert('No expenses to export');
      return;
    }

    const headers = ['Date', 'Description', 'Category', 'Job', 'Vendor', 'Type', 'Payment Method', 'Amount', 'Notes'];
    const rows = filteredExpenses.map(expense => [
      expense.date,
      `"${expense.description.replace(/"/g, '""')}"`,
      expense.category?.name || '',
      expense.job_name || '',
      expense.vendor || '',
      expense.is_business ? 'Business' : 'Personal',
      expense.payment_method || '',
      expense.amount.toFixed(2),
      expense.notes ? `"${expense.notes.replace(/"/g, '""')}"` : '',
    ]);

    const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    const dateStr = new Date().toISOString().split('T')[0];
    link.setAttribute('href', url);
    link.setAttribute('download', `expenses_${dateStr}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  const filteredExpenses = getFilteredExpenses();
  const totalAmount = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
  const businessTotal = filteredExpenses.filter(e => e.is_business).reduce((sum, e) => sum + e.amount, 0);
  const personalTotal = filteredExpenses.filter(e => !e.is_business).reduce((sum, e) => sum + e.amount, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading expenses...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <h1 className="text-2xl font-bold text-gray-900">All Expenses</h1>
          <div className="flex flex-wrap gap-3">
              <button onClick={exportToCSV} className="px-4 py-2 border border-gray-300 text-gray-700 hover:bg-gray-100 rounded-lg transition font-medium flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Export CSV
              </button>
              <Link href="/expenses/new" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold">+ Add Expense</Link>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Search</label>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search description, vendor, PO"
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-4 justify-between">
            <div className="flex flex-wrap gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Type</label>
                <select value={filterType} onChange={(e) => setFilterType(e.target.value as any)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500">
                  <option value="all">All Types</option>
                  <option value="business">Business Only</option>
                  <option value="personal">Personal Only</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Date Range</label>
                <select value={dateRange} onChange={(e) => setDateRange(e.target.value as any)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500">
                  <option value="all">All Time</option>
                  <option value="month">This Month</option>
                  <option value="quarter">This Quarter</option>
                  <option value="year">This Year</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Job</label>
                <select value={jobFilterId} onChange={(e) => setJobFilterId(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500">
                  <option value="">All Jobs</option>
                  {jobs.map((job) => (
                    <option key={job.id} value={job.id}>{job.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-3 grid grid-cols-3 gap-4 text-sm min-w-[300px]">
              <div>
                <p className="text-gray-500">Total</p>
                <p className="font-semibold text-gray-900">${totalAmount.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-gray-500">Business</p>
                <p className="font-semibold text-blue-700">${businessTotal.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-gray-500">Personal</p>
                <p className="font-semibold text-gray-900">${personalTotal.toFixed(2)}</p>
              </div>
            </div>
          </div>
        </div>

        {filteredExpenses.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center text-gray-600">
            No expenses found for the selected filters.
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Job</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">PO #</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vendor</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredExpenses.map((expense) => (
                  <tr key={expense.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{new Date(expense.date).toLocaleDateString()}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{expense.description}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {expense.category && (
                        <span className="inline-flex items-center gap-1">
                          <span>{expense.category.icon}</span>
                          <span>{expense.category.name}</span>
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{expense.job_name || '—'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{expense.po_number || '—'}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{expense.vendor || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${expense.is_business ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}`}>
                        {expense.is_business ? 'Business' : 'Personal'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-gray-900">${expense.amount.toFixed(2)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right space-x-3">
                      <button onClick={() => {
                        setEditingExpense(expense);
                        // Store original values for learning detection
                        setOriginalExpenseValues({
                          category_id: expense.category_id,
                          is_business: expense.is_business,
                          vendor: expense.vendor,
                        });
                        setEditFormData({
                          amount: expense.amount.toString(),
                          description: expense.description,
                          category_id: expense.category_id || '',
                          date: expense.date,
                          vendor: expense.vendor || '',
                          payment_method: expense.payment_method || 'credit',
                          is_business: expense.is_business,
                          notes: expense.notes || '',
                          job_id: expense.job_id || '',
                        });
                      }} className="text-blue-600 hover:text-blue-900">Edit</button>
                      <button onClick={() => deleteExpense(expense.id)} className="text-red-600 hover:text-red-900">Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-6 flex justify-between items-center">
          <p className="text-sm text-gray-600">
            Showing {filteredExpenses.length} of {expenses.length} expense{expenses.length !== 1 ? 's' : ''}
            {filterType !== 'all' || dateRange !== 'all' || jobFilterId ? ' (filtered)' : ''}
          </p>
          <Link href="/expenses/dashboard" className="text-blue-600 hover:text-blue-700 font-semibold">Back to Dashboard</Link>
        </div>
      </main>

      {editingExpense && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-900">Edit Expense</h2>
                <button onClick={() => { setEditingExpense(null); setShowAddCategory(false); setOriginalExpenseValues(null); }} className="text-gray-400 hover:text-gray-600">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <form onSubmit={handleEditSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Amount *</label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5">$</span>
                    <input type="number" step="0.01" required value={editFormData.amount} onChange={(e) => setEditFormData({ ...editFormData, amount: e.target.value })} className="w-full pl-8 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Description *</label>
                  <input type="text" required value={editFormData.description} onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-sm font-medium">Category</label>
                    <button
                      type="button"
                      onClick={() => setShowAddCategory(!showAddCategory)}
                      className="text-xs text-purple-600 hover:text-purple-700 font-medium flex items-center gap-1"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Add Category
                    </button>
                  </div>

                  {showAddCategory && (
                    <div className="mb-2 p-3 bg-purple-50 border border-purple-200 rounded-lg">
                      <div className="space-y-2">
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={newCategory.name}
                            onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                            className="flex-1 px-2 py-1.5 border rounded text-sm focus:ring-2 focus:ring-purple-500"
                            placeholder="Category name"
                          />
                          <select
                            value={newCategory.icon}
                            onChange={(e) => setNewCategory({ ...newCategory, icon: e.target.value })}
                            className="w-16 px-1 py-1.5 border rounded text-sm"
                          >
                            <option value="📁">📁</option>
                            <option value="🛒">🛒</option>
                            <option value="⛽">⛽</option>
                            <option value="🍽️">🍽️</option>
                            <option value="🏠">🏠</option>
                            <option value="🚗">🚗</option>
                            <option value="💊">💊</option>
                            <option value="👤">👤</option>
                            <option value="🎁">🎁</option>
                            <option value="🐕">🐕</option>
                          </select>
                        </div>
                        <div className="flex gap-2">
                          <select
                            value={newCategory.deduction_percentage}
                            onChange={(e) => setNewCategory({ ...newCategory, deduction_percentage: parseInt(e.target.value) })}
                            className="flex-1 px-2 py-1.5 border rounded text-sm"
                          >
                            <option value={0}>0% - Personal</option>
                            <option value={50}>50% - Meals</option>
                            <option value={100}>100% - Business</option>
                          </select>
                          <button
                            type="button"
                            onClick={handleCreateCategory}
                            disabled={creatingCategory || !newCategory.name.trim()}
                            className="px-3 py-1.5 bg-purple-600 text-white rounded text-sm font-medium hover:bg-purple-700 disabled:opacity-50"
                          >
                            {creatingCategory ? '...' : 'Add'}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  <select value={editFormData.category_id} onChange={(e) => setEditFormData({ ...editFormData, category_id: e.target.value })} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500">
                    <option value="">Select a category</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>{cat.icon} {cat.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Date *</label>
                  <input type="date" required value={editFormData.date} onChange={(e) => setEditFormData({ ...editFormData, date: e.target.value })} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Vendor</label>
                  <input type="text" value={editFormData.vendor} onChange={(e) => setEditFormData({ ...editFormData, vendor: e.target.value })} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Payment Method</label>
                  <select value={editFormData.payment_method} onChange={(e) => setEditFormData({ ...editFormData, payment_method: e.target.value })} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500">
                    <option value="credit">Credit Card</option>
                    <option value="debit">Debit Card</option>
                    <option value="cash">Cash</option>
                    <option value="bank_transfer">Bank Transfer</option>
                  </select>
                </div>

                <div>
                  <label className="flex items-center gap-3">
                    <input type="checkbox" checked={editFormData.is_business} onChange={(e) => setEditFormData({ ...editFormData, is_business: e.target.checked })} className="w-5 h-5 text-blue-600 rounded" />
                    <span className="text-sm font-medium">This is a business expense</span>
                  </label>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Job</label>
                  <select value={editFormData.job_id} onChange={(e) => setEditFormData({ ...editFormData, job_id: e.target.value })} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500">
                    <option value="">No job / general expense</option>
                    {jobs.map((job) => (
                      <option key={job.id} value={job.id}>{job.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Notes</label>
                  <textarea value={editFormData.notes} onChange={(e) => setEditFormData({ ...editFormData, notes: e.target.value })} rows={3} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" />
                </div>

                <div className="flex gap-3 pt-4">
                  <button type="submit" disabled={saving} className="flex-1 bg-blue-600 text-white py-2 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50">{saving ? 'Saving...' : 'Save Changes'}</button>
                  <button type="button" onClick={() => { setEditingExpense(null); setShowAddCategory(false); setOriginalExpenseValues(null); }} className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg font-semibold hover:bg-gray-300">Cancel</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Learning Prompt Modal */}
      {showLearningModal && learningSuggestion && userId && (
        <LearningPromptModal
          isOpen={showLearningModal}
          onClose={() => {
            setShowLearningModal(false);
            setLearningSuggestion(null);
          }}
          onSuccess={() => {
            // Optionally show a success toast
          }}
          suggestion={learningSuggestion}
          categories={categories}
          vendor={editFormData.vendor}
          userId={userId}
        />
      )}
    </div>
  );
}
