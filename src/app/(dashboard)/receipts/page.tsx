'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

import { supabase } from '@/utils/supabase';

interface ExpenseWithReceipt {
  id: string;
  amount: number;
  description: string;
  date: string;
  vendor: string | null;
  is_business: boolean;
  receipt_url: string;
  category: {
    name: string;
    icon: string;
  } | null;
}

export default function ReceiptsPage() {
  const [expenses, setExpenses] = useState<ExpenseWithReceipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReceipt, setSelectedReceipt] = useState<ExpenseWithReceipt | null>(null);
  const [filterType, setFilterType] = useState<'all' | 'business' | 'personal'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadReceipts();
  }, []);

  async function loadReceipts() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const { data, error } = await supabase
        .from('expenses')
        .select('id, amount, description, date, vendor, is_business, receipt_url, categories(name, icon)')
        .eq('user_id', user.id)
        .not('receipt_url', 'is', null)
        .order('date', { ascending: false });

      if (error) throw error;

      const formattedExpenses = data?.map((exp: any) => ({ ...exp, category: exp.categories || null })) || [];
      setExpenses(formattedExpenses as ExpenseWithReceipt[]);
    } catch (error) {
      console.error('Error loading receipts:', error);
    } finally {
      setLoading(false);
    }
  }

  const filteredExpenses = expenses.filter(expense => {
    if (filterType === 'business' && !expense.is_business) return false;
    if (filterType === 'personal' && expense.is_business) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        expense.description.toLowerCase().includes(query) ||
        expense.vendor?.toLowerCase().includes(query) ||
        expense.category?.name.toLowerCase().includes(query)
      );
    }
    return true;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading receipts...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      

      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <h1 className="text-2xl font-bold text-gray-900">Receipt Gallery</h1>
            <Link href="/expenses/new" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold">+ Add Expense with Receipt</Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-500 mb-1">Search</label>
              <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search by description, vendor, or category..." className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Type</label>
              <select value={filterType} onChange={(e) => setFilterType(e.target.value as any)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500">
                <option value="all">All Receipts</option>
                <option value="business">Business Only</option>
                <option value="personal">Personal Only</option>
              </select>
            </div>
          </div>
        </div>

        {filteredExpenses.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <div className="text-6xl mb-4">🧾</div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">{expenses.length === 0 ? 'No Receipts Yet' : 'No Matching Receipts'}</h2>
            <p className="text-gray-600 mb-6">
              {expenses.length === 0 ? 'Upload receipts when adding expenses to see them here.' : 'Try adjusting your search or filters.'}
            </p>
            <Link href="/expenses/new" className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold">Add Expense with Receipt</Link>
          </div>
        ) : (
          <>
            <p className="text-sm text-gray-600 mb-4">Showing {filteredExpenses.length} receipt{filteredExpenses.length !== 1 ? 's' : ''}</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {filteredExpenses.map((expense) => (
                <div key={expense.id} className="bg-white rounded-lg shadow overflow-hidden cursor-pointer hover:shadow-lg transition group" onClick={() => setSelectedReceipt(expense)}>
                  <div className="aspect-[3/4] relative bg-gray-100">
                    <img src={expense.receipt_url} alt={expense.description} className="w-full h-full object-cover group-hover:opacity-90 transition" onError={(e) => { (e.target as HTMLImageElement).src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iI2YzZjRmNiIvPjx0ZXh0IHg9IjUwIiB5PSI1MCIgZm9udC1zaXplPSIzMCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iIGZpbGw9IiM5Y2EzYWYiPvCfp748L3RleHQ+PC9zdmc+'; }} />
                    <div className="absolute top-2 right-2">
                      <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${expense.is_business ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}`}>{expense.is_business ? 'Biz' : 'Per'}</span>
                    </div>
                  </div>
                  <div className="p-3">
                    <p className="font-semibold text-gray-900 text-sm truncate">${expense.amount.toFixed(2)}</p>
                    <p className="text-xs text-gray-600 truncate">{expense.description}</p>
                    <p className="text-xs text-gray-400 mt-1">{new Date(expense.date).toLocaleDateString()}</p>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        <div className="mt-8">
          <Link href="/expenses/dashboard" className="text-blue-600 hover:text-blue-700 font-semibold">← Back to Dashboard</Link>
        </div>
      </main>

      {selectedReceipt && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50" onClick={() => setSelectedReceipt(null)}>
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center p-4 border-b">
              <div>
                <h2 className="font-semibold text-gray-900">{selectedReceipt.description}</h2>
                <p className="text-sm text-gray-600">{selectedReceipt.vendor && `${selectedReceipt.vendor} • `}{new Date(selectedReceipt.date).toLocaleDateString()}</p>
              </div>
              <button onClick={() => setSelectedReceipt(null)} className="p-2 hover:bg-gray-100 rounded-lg transition">✕</button>
            </div>
            <div className="p-4 max-h-[60vh] overflow-auto">
              <img src={selectedReceipt.receipt_url} alt={selectedReceipt.description} className="w-full h-auto rounded-lg" />
            </div>
            <div className="p-4 border-t bg-gray-50">
              <div className="flex flex-wrap gap-4 justify-between items-center">
                <div className="flex gap-4">
                  <div>
                    <p className="text-xs text-gray-500">Amount</p>
                    <p className="font-semibold text-lg">${selectedReceipt.amount.toFixed(2)}</p>
                  </div>
                  {selectedReceipt.category && (
                    <div>
                      <p className="text-xs text-gray-500">Category</p>
                      <p className="font-medium">{selectedReceipt.category.icon} {selectedReceipt.category.name}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-xs text-gray-500">Type</p>
                    <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${selectedReceipt.is_business ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}`}>{selectedReceipt.is_business ? 'Business' : 'Personal'}</span>
                  </div>
                </div>
                <a href={selectedReceipt.receipt_url} target="_blank" rel="noopener noreferrer" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium">View Full Size</a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
