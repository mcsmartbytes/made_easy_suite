'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

import Link from 'next/link';

type BidPackage = {
  id: string;
  job_id: string;
  job_name: string | null;
  package_number: string | null;
  name: string;
  csi_division: string | null;
  status: string;
  bid_due_date: string | null;
  budget_estimate: number | null;
  awarded_to_name: string | null;
  awarded_amount: number | null;
  invite_count: number;
  bid_count: number;
  created_at: string;
};

type Job = {
  id: string;
  name: string;
};

const CSI_DIVISIONS = [
  { code: '03', name: 'Concrete' },
  { code: '04', name: 'Masonry' },
  { code: '05', name: 'Metals' },
  { code: '06', name: 'Wood, Plastics, Composites' },
  { code: '07', name: 'Thermal & Moisture Protection' },
  { code: '08', name: 'Openings' },
  { code: '09', name: 'Finishes' },
  { code: '21', name: 'Fire Suppression' },
  { code: '22', name: 'Plumbing' },
  { code: '23', name: 'HVAC' },
  { code: '26', name: 'Electrical' },
  { code: '31', name: 'Earthwork' },
  { code: '32', name: 'Exterior Improvements' },
  { code: '33', name: 'Utilities' },
];

export default function BidPackagesPage() {
  const { user } = useAuth();
  const [packages, setPackages] = useState<BidPackage[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [filterJob, setFilterJob] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const [formData, setFormData] = useState({
    job_id: '',
    name: '',
    csi_division: '',
    description: '',
    scope_of_work: '',
    inclusions: '',
    exclusions: '',
    bid_due_date: '',
    work_start_date: '',
    work_end_date: '',
    budget_estimate: '',
    notes: '',
  });

  useEffect(() => {
    if (user?.id) {
      loadPackages();
      loadJobs();
    }
  }, [user?.id, filterJob, filterStatus]);

  async function loadPackages() {
    if (!user?.id) return;
    setLoading(true);
    try {
      let url = `/api/bid-packages?user_id=${user.id}`;
      if (filterJob) url += `&job_id=${filterJob}`;
      if (filterStatus) url += `&status=${filterStatus}`;

      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setPackages(data.data || []);
      }
    } catch (err) {
      console.error('Failed to load bid packages:', err);
    } finally {
      setLoading(false);
    }
  }

  async function loadJobs() {
    if (!user?.id) return;
    try {
      const res = await fetch(`/api/jobs?user_id=${user.id}`);
      const data = await res.json();
      if (data.success) {
        setJobs(data.data || []);
      }
    } catch (err) {
      console.error('Failed to load jobs:', err);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user?.id) return;

    try {
      const res = await fetch('/api/bid-packages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          user_id: user.id,
          budget_estimate: formData.budget_estimate ? Number(formData.budget_estimate) : null,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setShowForm(false);
        resetForm();
        loadPackages();
      } else {
        alert(data.error || 'Failed to create bid package');
      }
    } catch (err) {
      console.error('Error creating bid package:', err);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this bid package and all associated bids?')) return;
    try {
      const res = await fetch(`/api/bid-packages?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        loadPackages();
      }
    } catch (err) {
      console.error('Error deleting bid package:', err);
    }
  }

  function resetForm() {
    setFormData({
      job_id: filterJob || '',
      name: '',
      csi_division: '',
      description: '',
      scope_of_work: '',
      inclusions: '',
      exclusions: '',
      bid_due_date: '',
      work_start_date: '',
      work_end_date: '',
      budget_estimate: '',
      notes: '',
    });
  }

  function getStatusColor(status: string) {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-700';
      case 'open': return 'bg-blue-100 text-blue-700';
      case 'reviewing': return 'bg-yellow-100 text-yellow-700';
      case 'awarded': return 'bg-green-100 text-green-700';
      case 'cancelled': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Bid Packages</h1>
            <p className="text-sm text-gray-600 mt-1">
              Manage trade scopes and collect subcontractor bids
            </p>
          </div>
          <button
            onClick={() => { resetForm(); setShowForm(true); }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
          >
            + New Bid Package
          </button>
        </div>

        {/* Filters */}
        <div className="mb-4 flex flex-wrap gap-3 items-center">
          <select
            value={filterJob}
            onChange={(e) => setFilterJob(e.target.value)}
            className="px-3 py-2 border rounded-lg"
          >
            <option value="">All Jobs</option>
            {jobs.map(j => <option key={j.id} value={j.id}>{j.name}</option>)}
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 border rounded-lg"
          >
            <option value="">All Statuses</option>
            <option value="draft">Draft</option>
            <option value="open">Open</option>
            <option value="reviewing">Reviewing</option>
            <option value="awarded">Awarded</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        {/* List */}
        {loading ? (
          <div className="bg-white rounded-lg shadow p-8 text-center text-gray-600">Loading...</div>
        ) : packages.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center text-gray-600">
            No bid packages found. Create one to start collecting bids from subcontractors.
          </div>
        ) : (
          <div className="grid gap-4">
            {packages.map((pkg) => (
              <div key={pkg.id} className="bg-white rounded-lg shadow p-5 hover:shadow-md transition-shadow">
                <div className="flex flex-col sm:flex-row justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-sm font-mono text-gray-500">{pkg.package_number}</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(pkg.status)}`}>
                        {pkg.status}
                      </span>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900">{pkg.name}</h3>
                    <div className="text-sm text-gray-600 mt-1">
                      Job: <Link href={`/jobs/${pkg.job_id}`} className="text-blue-600 hover:underline">{pkg.job_name || 'Unknown'}</Link>
                      {pkg.csi_division && (
                        <span className="ml-3">Division: {pkg.csi_division}</span>
                      )}
                    </div>
                    {pkg.bid_due_date && (
                      <div className="text-sm text-gray-500 mt-1">
                        Due: {new Date(pkg.bid_due_date).toLocaleDateString()}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col sm:items-end gap-2">
                    <div className="flex gap-4 text-sm">
                      <span className="text-gray-600">{pkg.invite_count} invited</span>
                      <span className="text-gray-600">{pkg.bid_count} bids</span>
                    </div>
                    {pkg.budget_estimate && (
                      <div className="text-sm text-gray-500">
                        Budget: ${pkg.budget_estimate.toLocaleString()}
                      </div>
                    )}
                    {pkg.awarded_to_name && (
                      <div className="text-sm text-green-600 font-medium">
                        Awarded to {pkg.awarded_to_name}
                        {pkg.awarded_amount && ` - $${pkg.awarded_amount.toLocaleString()}`}
                      </div>
                    )}
                    <div className="flex gap-2 mt-2">
                      <Link
                        href={`/bid-packages/${pkg.id}`}
                        className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                      >
                        Manage
                      </Link>
                      <button
                        onClick={() => handleDelete(pkg.id)}
                        className="px-3 py-1.5 text-red-600 hover:text-red-700 text-sm"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Form Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b">
                <h2 className="text-xl font-bold text-gray-900">Create Bid Package</h2>
              </div>
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Job *</label>
                    <select
                      value={formData.job_id}
                      onChange={(e) => setFormData({ ...formData, job_id: e.target.value })}
                      required
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select Job</option>
                      {jobs.map(j => <option key={j.id} value={j.id}>{j.name}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Package Name *</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                      placeholder="e.g., Electrical"
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">CSI Division</label>
                    <select
                      value={formData.csi_division}
                      onChange={(e) => setFormData({ ...formData, csi_division: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select Division</option>
                      {CSI_DIVISIONS.map(d => (
                        <option key={d.code} value={d.code}>{d.code} - {d.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      rows={2}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Scope of Work</label>
                    <textarea
                      value={formData.scope_of_work}
                      onChange={(e) => setFormData({ ...formData, scope_of_work: e.target.value })}
                      rows={3}
                      placeholder="Detailed scope of work for this trade package..."
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Inclusions</label>
                    <textarea
                      value={formData.inclusions}
                      onChange={(e) => setFormData({ ...formData, inclusions: e.target.value })}
                      rows={2}
                      placeholder="What's included..."
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Exclusions</label>
                    <textarea
                      value={formData.exclusions}
                      onChange={(e) => setFormData({ ...formData, exclusions: e.target.value })}
                      rows={2}
                      placeholder="What's excluded..."
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Bid Due Date</label>
                    <input
                      type="date"
                      value={formData.bid_due_date}
                      onChange={(e) => setFormData({ ...formData, bid_due_date: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Budget Estimate</label>
                    <input
                      type="number"
                      value={formData.budget_estimate}
                      onChange={(e) => setFormData({ ...formData, budget_estimate: e.target.value })}
                      placeholder="Optional"
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Work Start Date</label>
                    <input
                      type="date"
                      value={formData.work_start_date}
                      onChange={(e) => setFormData({ ...formData, work_start_date: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Work End Date</label>
                    <input
                      type="date"
                      value={formData.work_end_date}
                      onChange={(e) => setFormData({ ...formData, work_end_date: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t">
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                  >
                    Create Bid Package
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
