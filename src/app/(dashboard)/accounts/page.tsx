'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/utils/supabase';

interface Account {
  id: string;
  code: string;
  name: string;
  type: 'asset' | 'liability' | 'equity' | 'income' | 'expense';
  subtype: string;
  balance: number;
  description: string;
  is_active: boolean;
}

const accountTypes = [
  { value: 'asset', label: 'Assets', color: 'bg-blue-100 text-blue-700' },
  { value: 'liability', label: 'Liabilities', color: 'bg-red-100 text-red-700' },
  { value: 'equity', label: 'Equity', color: 'bg-purple-100 text-purple-700' },
  { value: 'income', label: 'Income', color: 'bg-green-100 text-green-700' },
  { value: 'expense', label: 'Expenses', color: 'bg-orange-100 text-orange-700' },
];

const subtypes: Record<string, string[]> = {
  asset: ['Cash', 'Bank', 'Accounts Receivable', 'Inventory', 'Fixed Assets', 'Other Current Assets'],
  liability: ['Accounts Payable', 'Credit Card', 'Loans', 'Other Current Liabilities', 'Long-term Liabilities'],
  equity: ['Owner Equity', 'Retained Earnings', 'Common Stock'],
  income: ['Sales', 'Service Revenue', 'Interest Income', 'Other Income'],
  expense: ['Cost of Goods Sold', 'Operating Expenses', 'Payroll', 'Marketing', 'Utilities', 'Rent', 'Other Expenses'],
};

export default function ChartOfAccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    type: '' as Account['type'] | '',
    subtype: '',
    description: '',
  });

  useEffect(() => {
    loadAccounts();
  }, []);

  const loadAccounts = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    // Standard chart of accounts
    const mockAccounts: Account[] = [
      // Assets
      { id: '1', code: '1000', name: 'Cash', type: 'asset', subtype: 'Cash', balance: 15420.50, description: 'Petty cash and cash on hand', is_active: true },
      { id: '2', code: '1010', name: 'Business Checking', type: 'asset', subtype: 'Bank', balance: 45230.75, description: 'Main operating account', is_active: true },
      { id: '3', code: '1020', name: 'Business Savings', type: 'asset', subtype: 'Bank', balance: 25000.00, description: 'Reserve account', is_active: true },
      { id: '4', code: '1100', name: 'Accounts Receivable', type: 'asset', subtype: 'Accounts Receivable', balance: 34500.00, description: 'Money owed by customers', is_active: true },
      { id: '5', code: '1500', name: 'Office Equipment', type: 'asset', subtype: 'Fixed Assets', balance: 8500.00, description: 'Computers, furniture, etc.', is_active: true },
      // Liabilities
      { id: '6', code: '2000', name: 'Accounts Payable', type: 'liability', subtype: 'Accounts Payable', balance: 12750.00, description: 'Money owed to vendors', is_active: true },
      { id: '7', code: '2100', name: 'Credit Card', type: 'liability', subtype: 'Credit Card', balance: 3200.00, description: 'Business credit card', is_active: true },
      { id: '8', code: '2500', name: 'Line of Credit', type: 'liability', subtype: 'Loans', balance: 10000.00, description: 'Business line of credit', is_active: true },
      // Equity
      { id: '9', code: '3000', name: 'Owner Equity', type: 'equity', subtype: 'Owner Equity', balance: 75000.00, description: 'Owner investment', is_active: true },
      { id: '10', code: '3100', name: 'Retained Earnings', type: 'equity', subtype: 'Retained Earnings', balance: 28201.25, description: 'Accumulated profits', is_active: true },
      // Income
      { id: '11', code: '4000', name: 'Service Revenue', type: 'income', subtype: 'Service Revenue', balance: 125750.00, description: 'Revenue from services', is_active: true },
      { id: '12', code: '4100', name: 'Product Sales', type: 'income', subtype: 'Sales', balance: 45000.00, description: 'Revenue from products', is_active: true },
      { id: '13', code: '4900', name: 'Interest Income', type: 'income', subtype: 'Interest Income', balance: 250.00, description: 'Bank interest earned', is_active: true },
      // Expenses
      { id: '14', code: '5000', name: 'Rent Expense', type: 'expense', subtype: 'Rent', balance: 24000.00, description: 'Office rent', is_active: true },
      { id: '15', code: '5100', name: 'Utilities', type: 'expense', subtype: 'Utilities', balance: 3600.00, description: 'Electric, water, internet', is_active: true },
      { id: '16', code: '5200', name: 'Office Supplies', type: 'expense', subtype: 'Operating Expenses', balance: 1500.00, description: 'General office supplies', is_active: true },
      { id: '17', code: '5300', name: 'Marketing', type: 'expense', subtype: 'Marketing', balance: 8500.00, description: 'Advertising and marketing', is_active: true },
      { id: '18', code: '5400', name: 'Software Subscriptions', type: 'expense', subtype: 'Operating Expenses', balance: 2400.00, description: 'SaaS tools and software', is_active: true },
      { id: '19', code: '5500', name: 'Professional Services', type: 'expense', subtype: 'Operating Expenses', balance: 5000.00, description: 'Legal, accounting, consulting', is_active: true },
    ];
    setAccounts(mockAccounts);
    setLoading(false);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const openModal = (account?: Account) => {
    if (account) {
      setEditingAccount(account);
      setFormData({
        code: account.code,
        name: account.name,
        type: account.type,
        subtype: account.subtype,
        description: account.description,
      });
    } else {
      setEditingAccount(null);
      setFormData({
        code: '',
        name: '',
        type: '',
        subtype: '',
        description: '',
      });
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingAccount(null);
    setFormData({
      code: '',
      name: '',
      type: '',
      subtype: '',
      description: '',
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingAccount) {
      setAccounts(accounts.map(a =>
        a.id === editingAccount.id
          ? { ...a, ...formData, type: formData.type as Account['type'] }
          : a
      ));
    } else {
      const newAccount: Account = {
        id: String(Date.now()),
        ...formData,
        type: formData.type as Account['type'],
        balance: 0,
        is_active: true,
      };
      setAccounts([...accounts, newAccount]);
    }
    closeModal();
  };

  const filteredAccounts = accounts.filter(account => {
    const matchesSearch = account.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      account.code.includes(searchTerm);
    const matchesType = typeFilter === 'all' || account.type === typeFilter;
    return matchesSearch && matchesType;
  });

  // Group by type
  const groupedAccounts = filteredAccounts.reduce((groups, account) => {
    const type = account.type;
    if (!groups[type]) groups[type] = [];
    groups[type].push(account);
    return groups;
  }, {} as Record<string, Account[]>);

  const totals = {
    assets: accounts.filter(a => a.type === 'asset').reduce((sum, a) => sum + a.balance, 0),
    liabilities: accounts.filter(a => a.type === 'liability').reduce((sum, a) => sum + a.balance, 0),
    equity: accounts.filter(a => a.type === 'equity').reduce((sum, a) => sum + a.balance, 0),
    income: accounts.filter(a => a.type === 'income').reduce((sum, a) => sum + a.balance, 0),
    expenses: accounts.filter(a => a.type === 'expense').reduce((sum, a) => sum + a.balance, 0),
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
          <h1 className="text-2xl font-bold text-corporate-dark">Chart of Accounts</h1>
          <p className="text-corporate-gray mt-1">Manage your account structure</p>
        </div>
        <button
          onClick={() => openModal()}
          className="btn-primary flex items-center gap-2 justify-center"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Account
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="stat-card">
          <p className="text-sm text-corporate-gray">Total Assets</p>
          <p className="text-lg font-bold text-blue-600">{formatCurrency(totals.assets)}</p>
        </div>
        <div className="stat-card">
          <p className="text-sm text-corporate-gray">Total Liabilities</p>
          <p className="text-lg font-bold text-red-600">{formatCurrency(totals.liabilities)}</p>
        </div>
        <div className="stat-card">
          <p className="text-sm text-corporate-gray">Total Equity</p>
          <p className="text-lg font-bold text-purple-600">{formatCurrency(totals.equity)}</p>
        </div>
        <div className="stat-card">
          <p className="text-sm text-corporate-gray">Total Income</p>
          <p className="text-lg font-bold text-green-600">{formatCurrency(totals.income)}</p>
        </div>
        <div className="stat-card">
          <p className="text-sm text-corporate-gray">Total Expenses</p>
          <p className="text-lg font-bold text-orange-600">{formatCurrency(totals.expenses)}</p>
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
              placeholder="Search accounts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-field pl-10"
            />
          </div>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="input-field w-auto"
          >
            <option value="all">All Types</option>
            {accountTypes.map(type => (
              <option key={type.value} value={type.value}>{type.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Accounts by type */}
      {accountTypes.map(type => {
        const typeAccounts = groupedAccounts[type.value];
        if (!typeAccounts || typeAccounts.length === 0) return null;

        return (
          <div key={type.value} className="card overflow-hidden">
            <div className="flex items-center gap-2 mb-4">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${type.color}`}>
                {type.label}
              </span>
              <span className="text-sm text-corporate-gray">
                {typeAccounts.length} account{typeAccounts.length !== 1 ? 's' : ''}
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Code</th>
                    <th>Account Name</th>
                    <th>Subtype</th>
                    <th className="text-right">Balance</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {typeAccounts.sort((a, b) => a.code.localeCompare(b.code)).map(account => (
                    <tr key={account.id}>
                      <td className="font-mono text-sm">{account.code}</td>
                      <td>
                        <p className="font-medium text-corporate-dark">{account.name}</p>
                        {account.description && (
                          <p className="text-xs text-corporate-gray">{account.description}</p>
                        )}
                      </td>
                      <td className="text-corporate-slate">{account.subtype}</td>
                      <td className="text-right font-semibold text-corporate-dark">
                        {formatCurrency(account.balance)}
                      </td>
                      <td className="text-right">
                        <button
                          onClick={() => openModal(account)}
                          className="p-2 text-corporate-gray hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-corporate-dark">
                {editingAccount ? 'Edit Account' : 'Add New Account'}
              </h2>
              <button onClick={closeModal} className="p-2 text-corporate-gray hover:bg-gray-100 rounded-lg">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Account Code *</label>
                  <input
                    type="text"
                    required
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    className="input-field font-mono"
                    placeholder="1000"
                  />
                </div>
                <div>
                  <label className="label">Account Type *</label>
                  <select
                    required
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as Account['type'], subtype: '' })}
                    className="input-field"
                  >
                    <option value="">Select type</option>
                    {accountTypes.map(type => (
                      <option key={type.value} value={type.value}>{type.label}</option>
                    ))}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="label">Account Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="input-field"
                    placeholder="Cash"
                  />
                </div>
                <div className="col-span-2">
                  <label className="label">Subtype</label>
                  <select
                    value={formData.subtype}
                    onChange={(e) => setFormData({ ...formData, subtype: e.target.value })}
                    className="input-field"
                    disabled={!formData.type}
                  >
                    <option value="">Select subtype</option>
                    {formData.type && subtypes[formData.type]?.map(sub => (
                      <option key={sub} value={sub}>{sub}</option>
                    ))}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="label">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="input-field"
                    rows={2}
                    placeholder="Brief description of this account"
                  />
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={closeModal} className="flex-1 btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="flex-1 btn-primary">
                  {editingAccount ? 'Update Account' : 'Add Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
