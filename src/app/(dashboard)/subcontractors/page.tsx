'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';


type Subcontractor = {
  id: string;
  company_name: string;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  primary_trade: string | null;
  license_verified: boolean;
  coi_on_file: boolean;
  w9_on_file: boolean;
  insurance_expiry: string | null;
  is_preferred: boolean;
  is_active: boolean;
  rating: number | null;
  projects_completed: number;
};

const TRADES = [
  'Electrical', 'Plumbing', 'HVAC', 'Roofing', 'Framing',
  'Drywall', 'Painting', 'Flooring', 'Concrete', 'Masonry',
  'Landscaping', 'Excavation', 'Demolition', 'Fire Protection',
  'Insulation', 'Windows & Doors', 'Cabinets', 'Tile', 'Other'
];

export default function SubcontractorsPage() {
  const { user } = useAuth();
  const [subcontractors, setSubcontractors] = useState<Subcontractor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingSub, setEditingSub] = useState<Subcontractor | null>(null);
  const [filterTrade, setFilterTrade] = useState('');
  const [showInactive, setShowInactive] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    company_name: '',
    contact_name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    zip: '',
    primary_trade: '',
    license_number: '',
    license_state: '',
    license_expiry: '',
    insurance_company: '',
    insurance_policy_number: '',
    insurance_expiry: '',
    insurance_amount: '',
    workers_comp_policy: '',
    workers_comp_expiry: '',
    tax_id: '',
    notes: '',
  });

  useEffect(() => {
    if (user?.id) {
      loadSubcontractors();
    }
  }, [user?.id, filterTrade, showInactive]);

  async function loadSubcontractors() {
    if (!user?.id) return;
    setLoading(true);
    try {
      let url = `/api/subcontractors?user_id=${user.id}&active_only=${!showInactive}`;
      if (filterTrade) {
        url += `&trade=${encodeURIComponent(filterTrade)}`;
      }
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setSubcontractors(data.data || []);
      }
    } catch (err) {
      console.error('Failed to load subcontractors:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user?.id) return;

    try {
      const payload = {
        ...formData,
        user_id: user.id,
        insurance_amount: formData.insurance_amount ? Number(formData.insurance_amount) : null,
      };

      let res;
      if (editingSub) {
        res = await fetch('/api/subcontractors', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editingSub.id, ...payload }),
        });
      } else {
        res = await fetch('/api/subcontractors', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }

      const data = await res.json();
      if (data.success) {
        setShowForm(false);
        setEditingSub(null);
        resetForm();
        loadSubcontractors();
      } else {
        alert(data.error || 'Failed to save subcontractor');
      }
    } catch (err) {
      console.error('Error saving subcontractor:', err);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this subcontractor?')) return;
    try {
      const res = await fetch(`/api/subcontractors?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        loadSubcontractors();
      }
    } catch (err) {
      console.error('Error deleting subcontractor:', err);
    }
  }

  async function toggleActive(sub: Subcontractor) {
    try {
      const res = await fetch('/api/subcontractors', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: sub.id, is_active: !sub.is_active }),
      });
      const data = await res.json();
      if (data.success) {
        loadSubcontractors();
      }
    } catch (err) {
      console.error('Error updating subcontractor:', err);
    }
  }

  function resetForm() {
    setFormData({
      company_name: '',
      contact_name: '',
      email: '',
      phone: '',
      address: '',
      city: '',
      state: '',
      zip: '',
      primary_trade: '',
      license_number: '',
      license_state: '',
      license_expiry: '',
      insurance_company: '',
      insurance_policy_number: '',
      insurance_expiry: '',
      insurance_amount: '',
      workers_comp_policy: '',
      workers_comp_expiry: '',
      tax_id: '',
      notes: '',
    });
  }

  function openEdit(sub: Subcontractor) {
    setEditingSub(sub);
    setFormData({
      company_name: sub.company_name || '',
      contact_name: sub.contact_name || '',
      email: sub.email || '',
      phone: sub.phone || '',
      address: '',
      city: '',
      state: '',
      zip: '',
      primary_trade: sub.primary_trade || '',
      license_number: '',
      license_state: '',
      license_expiry: '',
      insurance_company: '',
      insurance_policy_number: '',
      insurance_expiry: sub.insurance_expiry || '',
      insurance_amount: '',
      workers_comp_policy: '',
      workers_comp_expiry: '',
      tax_id: '',
      notes: '',
    });
    setShowForm(true);
  }

  function getComplianceStatus(sub: Subcontractor) {
    const checks = [sub.license_verified, sub.coi_on_file, sub.w9_on_file];
    const passed = checks.filter(Boolean).length;
    if (passed === 3) return { label: 'Compliant', color: 'bg-green-100 text-green-700' };
    if (passed > 0) return { label: 'Partial', color: 'bg-yellow-100 text-yellow-700' };
    return { label: 'Pending', color: 'bg-red-100 text-red-700' };
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Subcontractors</h1>
            <p className="text-sm text-gray-600 mt-1">
              {subcontractors.length} subcontractor{subcontractors.length !== 1 ? 's' : ''}
            </p>
          </div>
          <button
            onClick={() => { resetForm(); setEditingSub(null); setShowForm(true); }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
          >
            + Add Subcontractor
          </button>
        </div>

        {/* Filters */}
        <div className="mb-4 flex flex-wrap gap-3 items-center">
          <select
            value={filterTrade}
            onChange={(e) => setFilterTrade(e.target.value)}
            className="px-3 py-2 border rounded-lg"
          >
            <option value="">All Trades</option>
            {TRADES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
              className="rounded"
            />
            Show Inactive
          </label>
        </div>

        {/* List */}
        {loading ? (
          <div className="bg-white rounded-lg shadow p-8 text-center text-gray-600">Loading...</div>
        ) : subcontractors.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center text-gray-600">
            No subcontractors found. Add your first one above.
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left text-gray-600 font-medium">Company</th>
                    <th className="px-4 py-3 text-left text-gray-600 font-medium">Trade</th>
                    <th className="px-4 py-3 text-left text-gray-600 font-medium">Contact</th>
                    <th className="px-4 py-3 text-left text-gray-600 font-medium">Compliance</th>
                    <th className="px-4 py-3 text-left text-gray-600 font-medium">Ins. Expiry</th>
                    <th className="px-4 py-3 text-right text-gray-600 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {subcontractors.map((sub, idx) => {
                    const compliance = getComplianceStatus(sub);
                    return (
                      <tr key={sub.id} className={`border-t ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/40'} ${!sub.is_active ? 'opacity-50' : ''}`}>
                        <td className="px-4 py-3">
                          <div className="font-medium text-gray-900 flex items-center gap-2">
                            {sub.company_name}
                            {sub.is_preferred && (
                              <span className="text-yellow-500 text-xs">★</span>
                            )}
                          </div>
                          {sub.projects_completed > 0 && (
                            <div className="text-xs text-gray-500">{sub.projects_completed} projects</div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-gray-600">{sub.primary_trade || '—'}</td>
                        <td className="px-4 py-3">
                          <div className="text-gray-900">{sub.contact_name || '—'}</div>
                          <div className="text-xs text-gray-500">{sub.email}</div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${compliance.color}`}>
                            {compliance.label}
                          </span>
                          <div className="text-xs text-gray-500 mt-1">
                            {sub.license_verified ? '✓' : '○'} Lic
                            {' '}{sub.coi_on_file ? '✓' : '○'} COI
                            {' '}{sub.w9_on_file ? '✓' : '○'} W9
                          </div>
                        </td>
                        <td className="px-4 py-3 text-gray-600">
                          {sub.insurance_expiry ? new Date(sub.insurance_expiry).toLocaleDateString() : '—'}
                        </td>
                        <td className="px-4 py-3 text-right space-x-2">
                          <button
                            onClick={() => openEdit(sub)}
                            className="text-blue-600 hover:text-blue-700 font-medium"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => toggleActive(sub)}
                            className="text-gray-600 hover:text-gray-800"
                          >
                            {sub.is_active ? 'Deactivate' : 'Activate'}
                          </button>
                          <button
                            onClick={() => handleDelete(sub.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Form Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b">
                <h2 className="text-xl font-bold text-gray-900">
                  {editingSub ? 'Edit Subcontractor' : 'Add Subcontractor'}
                </h2>
              </div>
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Company Name *</label>
                    <input
                      type="text"
                      value={formData.company_name}
                      onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                      required
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Contact Name</label>
                    <input
                      type="text"
                      value={formData.contact_name}
                      onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Primary Trade</label>
                    <select
                      value={formData.primary_trade}
                      onChange={(e) => setFormData({ ...formData, primary_trade: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select Trade</option>
                      {TRADES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="md:col-span-2 border-t pt-4 mt-2">
                    <h3 className="font-medium text-gray-900 mb-3">License Information</h3>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">License Number</label>
                    <input
                      type="text"
                      value={formData.license_number}
                      onChange={(e) => setFormData({ ...formData, license_number: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">License State</label>
                    <input
                      type="text"
                      value={formData.license_state}
                      onChange={(e) => setFormData({ ...formData, license_state: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., CA"
                    />
                  </div>

                  <div className="md:col-span-2 border-t pt-4 mt-2">
                    <h3 className="font-medium text-gray-900 mb-3">Insurance Information</h3>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Insurance Company</label>
                    <input
                      type="text"
                      value={formData.insurance_company}
                      onChange={(e) => setFormData({ ...formData, insurance_company: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Policy Number</label>
                    <input
                      type="text"
                      value={formData.insurance_policy_number}
                      onChange={(e) => setFormData({ ...formData, insurance_policy_number: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Insurance Expiry</label>
                    <input
                      type="date"
                      value={formData.insurance_expiry}
                      onChange={(e) => setFormData({ ...formData, insurance_expiry: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Coverage Amount</label>
                    <input
                      type="number"
                      value={formData.insurance_amount}
                      onChange={(e) => setFormData({ ...formData, insurance_amount: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., 1000000"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                    <textarea
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      rows={3}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t">
                  <button
                    type="button"
                    onClick={() => { setShowForm(false); setEditingSub(null); }}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                  >
                    {editingSub ? 'Save Changes' : 'Add Subcontractor'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
