'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';


type CostCode = {
  id: string;
  code: string;
  division: string;
  name: string;
  description: string | null;
  parent_code: string | null;
  level: number;
  is_default: boolean;
  user_id: string | null;
};

const CSI_DIVISIONS = [
  { code: '00', name: 'Procurement and Contracting' },
  { code: '01', name: 'General Requirements' },
  { code: '02', name: 'Existing Conditions' },
  { code: '03', name: 'Concrete' },
  { code: '04', name: 'Masonry' },
  { code: '05', name: 'Metals' },
  { code: '06', name: 'Wood, Plastics, Composites' },
  { code: '07', name: 'Thermal & Moisture Protection' },
  { code: '08', name: 'Openings' },
  { code: '09', name: 'Finishes' },
  { code: '10', name: 'Specialties' },
  { code: '11', name: 'Equipment' },
  { code: '12', name: 'Furnishings' },
  { code: '13', name: 'Special Construction' },
  { code: '14', name: 'Conveying Equipment' },
  { code: '21', name: 'Fire Suppression' },
  { code: '22', name: 'Plumbing' },
  { code: '23', name: 'HVAC' },
  { code: '25', name: 'Integrated Automation' },
  { code: '26', name: 'Electrical' },
  { code: '27', name: 'Communications' },
  { code: '28', name: 'Electronic Safety & Security' },
  { code: '31', name: 'Earthwork' },
  { code: '32', name: 'Exterior Improvements' },
  { code: '33', name: 'Utilities' },
];

export default function CostCodesPage() {
  const { user } = useAuth();
  const [costCodes, setCostCodes] = useState<CostCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingCode, setEditingCode] = useState<CostCode | null>(null);

  // Filters
  const [filterDivision, setFilterDivision] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCustomOnly, setShowCustomOnly] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    code: '',
    division: '',
    name: '',
    description: '',
    parent_code: '',
    level: 2,
  });

  useEffect(() => {
    if (user?.id) {
      loadCostCodes();
    }
  }, [user?.id, filterDivision]);

  async function loadCostCodes() {
    if (!user?.id) return;
    setLoading(true);
    try {
      let url = `/api/cost-codes?user_id=${user.id}`;
      if (filterDivision) {
        url += `&division=${filterDivision}`;
      }
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setCostCodes(data.data || []);
      }
    } catch (err) {
      console.error('Failed to load cost codes:', err);
    } finally {
      setLoading(false);
    }
  }

  async function seedDefaultCodes() {
    setSeeding(true);
    try {
      const res = await fetch('/api/cost-codes/seed', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        if (data.seeded) {
          alert(`Successfully loaded ${data.count} CSI MasterFormat codes!`);
        } else {
          alert(data.message);
        }
        loadCostCodes();
      } else {
        alert(data.error || 'Failed to seed cost codes');
      }
    } catch (err) {
      console.error('Error seeding cost codes:', err);
      alert('Failed to seed cost codes');
    } finally {
      setSeeding(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user?.id) return;

    try {
      const payload = {
        ...formData,
        user_id: user.id,
      };

      let res;
      if (editingCode) {
        res = await fetch('/api/cost-codes', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editingCode.id, ...payload }),
        });
      } else {
        res = await fetch('/api/cost-codes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }

      const data = await res.json();
      if (data.success) {
        setShowForm(false);
        setEditingCode(null);
        resetForm();
        loadCostCodes();
      } else {
        alert(data.error || 'Failed to save cost code');
      }
    } catch (err) {
      console.error('Error saving cost code:', err);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this cost code?')) return;
    try {
      const res = await fetch(`/api/cost-codes?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        loadCostCodes();
      } else {
        alert(data.error || 'Failed to delete cost code');
      }
    } catch (err) {
      console.error('Error deleting cost code:', err);
    }
  }

  function resetForm() {
    setFormData({
      code: '',
      division: '',
      name: '',
      description: '',
      parent_code: '',
      level: 2,
    });
  }

  function openEdit(code: CostCode) {
    setEditingCode(code);
    setFormData({
      code: code.code,
      division: code.division,
      name: code.name,
      description: code.description || '',
      parent_code: code.parent_code || '',
      level: code.level,
    });
    setShowForm(true);
  }

  function openAdd() {
    resetForm();
    setEditingCode(null);
    // Pre-fill division if one is selected
    if (filterDivision) {
      setFormData(prev => ({ ...prev, division: filterDivision }));
    }
    setShowForm(true);
  }

  // Filter codes by search query and custom filter
  const filteredCodes = costCodes.filter(code => {
    if (showCustomOnly && code.is_default) return false;
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      code.code.toLowerCase().includes(query) ||
      code.name.toLowerCase().includes(query) ||
      (code.description && code.description.toLowerCase().includes(query))
    );
  });

  // Group by division for display
  const groupedCodes = filteredCodes.reduce((acc, code) => {
    const div = code.division;
    if (!acc[div]) acc[div] = [];
    acc[div].push(code);
    return acc;
  }, {} as Record<string, CostCode[]>);

  const divisions = Object.keys(groupedCodes).sort();

  const getDivisionName = (divCode: string) => {
    const div = CSI_DIVISIONS.find(d => d.code === divCode);
    return div ? div.name : `Division ${divCode}`;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Cost Codes</h1>
            <p className="text-sm text-gray-600 mt-1">
              CSI MasterFormat codes for estimates and billing
            </p>
          </div>
          <div className="flex gap-2">
            {costCodes.filter(c => c.is_default).length === 0 && (
              <button
                onClick={seedDefaultCodes}
                disabled={seeding}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium disabled:opacity-50"
              >
                {seeding ? 'Loading...' : 'Load CSI Codes'}
              </button>
            )}
            <button
              onClick={openAdd}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
            >
              + Add Custom Code
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-500">Total Codes</div>
            <div className="text-2xl font-bold text-gray-900">{costCodes.length}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-500">Standard Codes</div>
            <div className="text-2xl font-bold text-blue-600">
              {costCodes.filter(c => c.is_default).length}
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-500">Custom Codes</div>
            <div className="text-2xl font-bold text-green-600">
              {costCodes.filter(c => !c.is_default).length}
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-500">Divisions</div>
            <div className="text-2xl font-bold text-gray-900">
              {new Set(costCodes.map(c => c.division)).size}
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex-1 min-w-[200px]">
              <input
                type="text"
                placeholder="Search codes or names..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <select
              value={filterDivision}
              onChange={(e) => setFilterDivision(e.target.value)}
              className="px-3 py-2 border rounded-lg"
            >
              <option value="">All Divisions</option>
              {CSI_DIVISIONS.map(div => (
                <option key={div.code} value={div.code}>
                  {div.code} - {div.name}
                </option>
              ))}
            </select>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={showCustomOnly}
                onChange={(e) => setShowCustomOnly(e.target.checked)}
                className="rounded"
              />
              Custom Only
            </label>
          </div>
        </div>

        {/* Cost Codes List */}
        {loading ? (
          <div className="bg-white rounded-lg shadow p-8 text-center text-gray-600">
            Loading cost codes...
          </div>
        ) : filteredCodes.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <div className="text-gray-400 mb-4">
              <svg className="w-16 h-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <p className="text-gray-600 mb-4">
              {costCodes.length === 0
                ? 'No cost codes found. Load the CSI MasterFormat codes to get started.'
                : 'No matching cost codes found.'}
            </p>
            {costCodes.length === 0 && (
              <button
                onClick={seedDefaultCodes}
                disabled={seeding}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium disabled:opacity-50"
              >
                {seeding ? 'Loading...' : 'Load CSI MasterFormat Codes'}
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {divisions.map(div => (
              <div key={div} className="bg-white rounded-lg shadow overflow-hidden">
                <div className="px-4 py-3 bg-slate-800 text-white flex justify-between items-center">
                  <div>
                    <span className="font-mono font-bold mr-2">Division {div}</span>
                    <span className="text-slate-300">{getDivisionName(div)}</span>
                  </div>
                  <span className="text-sm text-slate-400">
                    {groupedCodes[div].length} codes
                  </span>
                </div>
                <div className="divide-y divide-gray-100">
                  {groupedCodes[div]
                    .sort((a, b) => a.code.localeCompare(b.code))
                    .map(code => (
                      <div
                        key={code.id}
                        className={`px-4 py-3 flex items-center justify-between hover:bg-gray-50 ${
                          code.level === 1 ? 'bg-gray-50 font-medium' : ''
                        } ${code.level === 2 ? 'pl-8' : ''}`}
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <code className="text-sm font-mono text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                              {code.code}
                            </code>
                            <span className="text-gray-900">{code.name}</span>
                            {!code.is_default && (
                              <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                                Custom
                              </span>
                            )}
                          </div>
                          {code.description && (
                            <p className="text-sm text-gray-500 mt-1 pl-20">{code.description}</p>
                          )}
                        </div>
                        {!code.is_default && (
                          <div className="flex gap-2">
                            <button
                              onClick={() => openEdit(code)}
                              className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDelete(code.id)}
                              className="text-red-600 hover:text-red-700 text-sm font-medium"
                            >
                              Delete
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add/Edit Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
              <div className="p-6 border-b">
                <h2 className="text-xl font-bold text-gray-900">
                  {editingCode ? 'Edit Cost Code' : 'Add Custom Cost Code'}
                </h2>
              </div>
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Code *
                    </label>
                    <input
                      type="text"
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                      required
                      placeholder="e.g., 03 35 50"
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Division *
                    </label>
                    <select
                      value={formData.division}
                      onChange={(e) => setFormData({ ...formData, division: e.target.value })}
                      required
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select Division</option>
                      {CSI_DIVISIONS.map(div => (
                        <option key={div.code} value={div.code}>
                          {div.code} - {div.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    placeholder="e.g., Polished Concrete Floors"
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={2}
                    placeholder="Optional description..."
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Parent Code
                    </label>
                    <input
                      type="text"
                      value={formData.parent_code}
                      onChange={(e) => setFormData({ ...formData, parent_code: e.target.value })}
                      placeholder="e.g., 03 35 00"
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Level
                    </label>
                    <select
                      value={formData.level}
                      onChange={(e) => setFormData({ ...formData, level: Number(e.target.value) })}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value={1}>1 - Division</option>
                      <option value={2}>2 - Section</option>
                      <option value={3}>3 - Subsection</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t">
                  <button
                    type="button"
                    onClick={() => { setShowForm(false); setEditingCode(null); }}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                  >
                    {editingCode ? 'Save Changes' : 'Add Code'}
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
