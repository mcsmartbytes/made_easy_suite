'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';

import ProtectedRoute from '@/components/ProtectedRoute';
import QRCode from 'qrcode';

type Category = {
  id: string;
  name: string;
  icon: string | null;
  color: string | null;
};

type Tool = {
  id: string;
  name: string;
  description: string | null;
  brand: string | null;
  model: string | null;
  serial_number: string | null;
  qr_code: string;
  asset_tag: string | null;
  purchase_date: string | null;
  purchase_price: number | null;
  current_value: number | null;
  warranty_expires: string | null;
  status: 'available' | 'checked_out' | 'maintenance' | 'retired' | 'lost';
  condition: 'excellent' | 'good' | 'fair' | 'poor' | 'needs_repair';
  home_location: string | null;
  current_location: string | null;
  image_url: string | null;
  notes: string | null;
  category_id: string | null;
  tool_categories: Category | null;
  assigned_to_job: string | null;
  jobs: { id: string; name: string } | null;
};

type Job = {
  id: string;
  name: string;
};

const STATUS_COLORS: Record<string, string> = {
  available: 'bg-green-100 text-green-800',
  checked_out: 'bg-blue-100 text-blue-800',
  maintenance: 'bg-yellow-100 text-yellow-800',
  retired: 'bg-gray-100 text-gray-800',
  lost: 'bg-red-100 text-red-800',
};

const CONDITION_COLORS: Record<string, string> = {
  excellent: 'text-green-600',
  good: 'text-blue-600',
  fair: 'text-yellow-600',
  poor: 'text-orange-600',
  needs_repair: 'text-red-600',
};

function ToolsPageContent() {
  const { user } = useAuth();
  const [tools, setTools] = useState<Tool[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter state
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [filterCategory, setFilterCategory] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [editingTool, setEditingTool] = useState<Tool | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category_id: '',
    brand: '',
    model: '',
    serial_number: '',
    asset_tag: '',
    purchase_date: '',
    purchase_price: '',
    current_value: '',
    warranty_expires: '',
    condition: 'good',
    home_location: '',
    notes: '',
  });

  // QR Modal state
  const [showQRModal, setShowQRModal] = useState(false);
  const [selectedTool, setSelectedTool] = useState<Tool | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  useEffect(() => {
    if (user) {
      void loadData();
    }
  }, [user]);

  async function loadData() {
    if (!user) return;

    setLoading(true);
    try {
      // Load categories
      const catRes = await fetch('/api/tools/categories');
      const catData = await catRes.json();
      if (catData.success) {
        setCategories(catData.data || []);
      }

      // Load jobs for assignment dropdown (via API)
      try {
        const jobRes = await fetch(`/api/jobs?user_id=${user.id}`);
        const jobData = await jobRes.json();
        if (jobData.success) {
          setJobs(jobData.data || []);
        }
      } catch {
        // Jobs API may not exist yet
        setJobs([]);
      }

      // Load tools
      const toolRes = await fetch(`/api/tools?user_id=${user.id}`);
      const toolData = await toolRes.json();
      if (toolData.success) {
        setTools(toolData.data || []);
      } else {
        setError(toolData.error || 'Failed to load tools');
      }
    } catch (err) {
      console.error('Error loading data:', err);
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setEditingTool(null);
    setFormData({
      name: '',
      description: '',
      category_id: '',
      brand: '',
      model: '',
      serial_number: '',
      asset_tag: '',
      purchase_date: '',
      purchase_price: '',
      current_value: '',
      warranty_expires: '',
      condition: 'good',
      home_location: '',
      notes: '',
    });
    setShowForm(false);
  }

  function handleEdit(tool: Tool) {
    setEditingTool(tool);
    setFormData({
      name: tool.name,
      description: tool.description || '',
      category_id: tool.category_id || '',
      brand: tool.brand || '',
      model: tool.model || '',
      serial_number: tool.serial_number || '',
      asset_tag: tool.asset_tag || '',
      purchase_date: tool.purchase_date || '',
      purchase_price: tool.purchase_price?.toString() || '',
      current_value: tool.current_value?.toString() || '',
      warranty_expires: tool.warranty_expires || '',
      condition: tool.condition,
      home_location: tool.home_location || '',
      notes: tool.notes || '',
    });
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !formData.name.trim()) return;

    try {
      const payload = {
        user_id: user.id,
        ...formData,
        purchase_price: formData.purchase_price || null,
        current_value: formData.current_value || null,
      };

      let res;
      if (editingTool) {
        res = await fetch('/api/tools', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editingTool.id, ...payload }),
        });
      } else {
        res = await fetch('/api/tools', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }

      const data = await res.json();
      if (data.success) {
        resetForm();
        await loadData();
      } else {
        setError(data.error || 'Failed to save tool');
      }
    } catch (err) {
      console.error('Error saving tool:', err);
      setError('Failed to save tool');
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this tool? This cannot be undone.')) return;

    try {
      const res = await fetch(`/api/tools?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        await loadData();
      } else {
        setError(data.error || 'Failed to delete');
      }
    } catch (err) {
      console.error('Error deleting:', err);
      setError('Failed to delete');
    }
  }

  async function showQR(tool: Tool) {
    setSelectedTool(tool);
    try {
      const url = await QRCode.toDataURL(tool.qr_code, {
        width: 256,
        margin: 2,
        color: { dark: '#000000', light: '#ffffff' },
      });
      setQrDataUrl(url);
      setShowQRModal(true);
    } catch (err) {
      console.error('Error generating QR:', err);
    }
  }

  function printQR() {
    if (!selectedTool || !qrDataUrl) return;
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>QR Code - ${selectedTool.name}</title>
            <style>
              body { font-family: Arial, sans-serif; text-align: center; padding: 20px; }
              .qr-container { display: inline-block; border: 2px solid #000; padding: 20px; }
              h2 { margin: 0 0 10px 0; font-size: 18px; }
              p { margin: 5px 0; font-size: 14px; color: #666; }
              .code { font-family: monospace; font-size: 12px; color: #333; }
            </style>
          </head>
          <body>
            <div class="qr-container">
              <h2>${selectedTool.name}</h2>
              ${selectedTool.brand ? `<p>${selectedTool.brand} ${selectedTool.model || ''}</p>` : ''}
              <img src="${qrDataUrl}" alt="QR Code" />
              <p class="code">${selectedTool.qr_code}</p>
            </div>
            <script>window.onload = function() { window.print(); }</script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  }

  // Filter tools
  const filteredTools = tools.filter(t => {
    if (filterStatus && t.status !== filterStatus) return false;
    if (filterCategory && t.category_id !== filterCategory) return false;
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      return (
        t.name.toLowerCase().includes(search) ||
        t.brand?.toLowerCase().includes(search) ||
        t.model?.toLowerCase().includes(search) ||
        t.serial_number?.toLowerCase().includes(search) ||
        t.qr_code.toLowerCase().includes(search)
      );
    }
    return true;
  });

  // Stats
  const totalTools = tools.length;
  const availableCount = tools.filter(t => t.status === 'available').length;
  const checkedOutCount = tools.filter(t => t.status === 'checked_out').length;
  const totalValue = tools.reduce((sum, t) => sum + (t.current_value || t.purchase_price || 0), 0);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        
        <div className="flex items-center justify-center py-24">
          <p className="text-gray-600">Loading tools...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      
      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Tool Tracking</h1>
            <p className="text-sm text-gray-600 mt-1">
              Manage your equipment inventory with QR codes
            </p>
          </div>
          <div className="flex gap-3">
            <Link
              href="/tools/scan"
              className="px-4 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700"
            >
              Scan QR
            </Link>
            <button
              onClick={() => { resetForm(); setShowForm(true); }}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700"
            >
              + Add Tool
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
            <button onClick={() => setError(null)} className="ml-2 underline">Dismiss</button>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-600">Total Tools</p>
            <p className="text-2xl font-bold text-gray-900">{totalTools}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-600">Available</p>
            <p className="text-2xl font-bold text-green-600">{availableCount}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-600">Checked Out</p>
            <p className="text-2xl font-bold text-blue-600">{checkedOutCount}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-600">Total Value</p>
            <p className="text-2xl font-bold text-gray-900">${totalValue.toLocaleString()}</p>
          </div>
        </div>

        {/* Add/Edit Form */}
        {showForm && (
          <section className="bg-white rounded-lg shadow p-5 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              {editingTool ? 'Edit Tool' : 'Add New Tool'}
            </h2>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-1">Tool Name *</label>
                <input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., DeWalt Circular Saw"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Category</label>
                <select
                  value={formData.category_id}
                  onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select category</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Condition</label>
                <select
                  value={formData.condition}
                  onChange={(e) => setFormData({ ...formData, condition: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="excellent">Excellent</option>
                  <option value="good">Good</option>
                  <option value="fair">Fair</option>
                  <option value="poor">Poor</option>
                  <option value="needs_repair">Needs Repair</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Brand</label>
                <input
                  value={formData.brand}
                  onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., DeWalt"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Model</label>
                <input
                  value={formData.model}
                  onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., DCS570B"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Serial Number</label>
                <input
                  value={formData.serial_number}
                  onChange={(e) => setFormData({ ...formData, serial_number: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Asset Tag</label>
                <input
                  value={formData.asset_tag}
                  onChange={(e) => setFormData({ ...formData, asset_tag: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Optional tag #"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Purchase Date</label>
                <input
                  type="date"
                  value={formData.purchase_date}
                  onChange={(e) => setFormData({ ...formData, purchase_date: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Purchase Price</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.purchase_price}
                  onChange={(e) => setFormData({ ...formData, purchase_price: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Current Value</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.current_value}
                  onChange={(e) => setFormData({ ...formData, current_value: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Warranty Expires</label>
                <input
                  type="date"
                  value={formData.warranty_expires}
                  onChange={(e) => setFormData({ ...formData, warranty_expires: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-1">Home Location</label>
                <input
                  value={formData.home_location}
                  onChange={(e) => setFormData({ ...formData, home_location: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Shop - Tool Wall A"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-1">Description</label>
                <input
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Optional description"
                />
              </div>
              <div className="md:col-span-4">
                <label className="block text-sm font-medium mb-1">Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  rows={2}
                />
              </div>
              <div className="md:col-span-4 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 border border-gray-300 rounded-lg font-medium hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700"
                >
                  {editingTool ? 'Update Tool' : 'Add Tool'}
                </button>
              </div>
            </form>
          </section>
        )}

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex flex-wrap gap-4 items-center">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Search</label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search tools..."
                className="px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Status</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Status</option>
                <option value="available">Available</option>
                <option value="checked_out">Checked Out</option>
                <option value="maintenance">Maintenance</option>
                <option value="retired">Retired</option>
                <option value="lost">Lost</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Category</label>
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Categories</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Tools Table */}
        <section className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-4 py-3 border-b">
            <h2 className="font-semibold text-gray-900">
              Tool Inventory ({filteredTools.length})
            </h2>
          </div>
          {filteredTools.length === 0 ? (
            <div className="p-6 text-sm text-gray-500 text-center">
              {tools.length === 0
                ? 'No tools added yet. Add your first tool to start tracking.'
                : 'No tools match your filters.'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-2 text-left text-gray-600 font-medium">Tool</th>
                    <th className="px-4 py-2 text-left text-gray-600 font-medium">Category</th>
                    <th className="px-4 py-2 text-left text-gray-600 font-medium">Status</th>
                    <th className="px-4 py-2 text-left text-gray-600 font-medium">Condition</th>
                    <th className="px-4 py-2 text-left text-gray-600 font-medium">Location</th>
                    <th className="px-4 py-2 text-right text-gray-600 font-medium">Value</th>
                    <th className="px-4 py-2 text-right text-gray-600 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTools.map((tool, idx) => (
                    <tr key={tool.id} className={`border-t ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/40'}`}>
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium text-gray-900">{tool.name}</p>
                          <p className="text-xs text-gray-500">
                            {tool.brand} {tool.model}
                            {tool.serial_number && ` · SN: ${tool.serial_number}`}
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {tool.tool_categories?.name || '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[tool.status]}`}>
                          {tool.status.replace('_', ' ')}
                        </span>
                        {tool.jobs && (
                          <p className="text-xs text-gray-500 mt-1">
                            @ {tool.jobs.name}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`capitalize ${CONDITION_COLORS[tool.condition]}`}>
                          {tool.condition.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600 text-sm">
                        {tool.current_location || tool.home_location || '—'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {tool.current_value || tool.purchase_price
                          ? `$${(tool.current_value || tool.purchase_price)?.toLocaleString()}`
                          : '—'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => showQR(tool)}
                            className="text-purple-600 hover:text-purple-800 text-sm font-medium"
                            title="Show QR Code"
                          >
                            QR
                          </button>
                          <button
                            onClick={() => handleEdit(tool)}
                            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(tool.id)}
                            className="text-red-600 hover:text-red-800 text-sm font-medium"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* QR Code Modal */}
        {showQRModal && selectedTool && (
          <div
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowQRModal(false)}
          >
            <div
              className="bg-white rounded-lg shadow-xl max-w-sm w-full p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-center">
                <h3 className="text-lg font-semibold text-gray-900 mb-1">{selectedTool.name}</h3>
                {selectedTool.brand && (
                  <p className="text-sm text-gray-500 mb-4">
                    {selectedTool.brand} {selectedTool.model}
                  </p>
                )}
                {qrDataUrl && (
                  <img src={qrDataUrl} alt="QR Code" className="mx-auto mb-2" />
                )}
                <p className="font-mono text-sm text-gray-600 mb-4">{selectedTool.qr_code}</p>
                <div className="flex gap-3 justify-center">
                  <button
                    onClick={printQR}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
                  >
                    Print Label
                  </button>
                  <button
                    onClick={() => setShowQRModal(false)}
                    className="px-4 py-2 border border-gray-300 rounded-lg font-medium hover:bg-gray-50"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

// Wrap with ProtectedRoute for authentication
export default function ToolsPage() {
  return (
    <ProtectedRoute>
      <ToolsPageContent />
    </ProtectedRoute>
  );
}
