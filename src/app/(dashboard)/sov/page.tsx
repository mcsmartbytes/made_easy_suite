'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

import Link from 'next/link';

type SOV = {
  id: string;
  job_id: string;
  job_name: string | null;
  estimate_id: string | null;
  name: string;
  status: string;
  version: number;
  total_contract_amount: number;
  line_count: number;
  approved_at: string | null;
  approved_by: string | null;
  created_at: string;
};

type Job = {
  id: string;
  name: string;
};

type Estimate = {
  id: string;
  job_id: string;
  job_name: string;
  name: string | null;
  po_number: string | null;
  total: number;
};

export default function SOVListPage() {
  const { user } = useAuth();
  const [sovs, setSovs] = useState<SOV[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [estimates, setEstimates] = useState<Estimate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [filterJob, setFilterJob] = useState('');

  const [formData, setFormData] = useState({
    job_id: '',
    estimate_id: '',
    name: 'Schedule of Values',
    generate_from_estimate: false,
  });

  useEffect(() => {
    if (user?.id) {
      loadData();
    }
  }, [user?.id, filterJob]);

  async function loadData() {
    setLoading(true);
    await Promise.all([loadSOVs(), loadJobs(), loadEstimates()]);
    setLoading(false);
  }

  async function loadSOVs() {
    if (!user?.id) return;
    try {
      let url = `/api/sov?user_id=${user.id}`;
      if (filterJob) url += `&job_id=${filterJob}`;

      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setSovs(data.data || []);
      }
    } catch (err) {
      console.error('Failed to load SOVs:', err);
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

  async function loadEstimates() {
    if (!user?.id) return;
    try {
      const res = await fetch(`/api/estimates?user_id=${user.id}&status=approved`);
      const data = await res.json();
      if (data.success) {
        setEstimates(data.data || []);
      }
    } catch (err) {
      console.error('Failed to load estimates:', err);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user?.id) return;

    try {
      const res = await fetch('/api/sov', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user.id,
          job_id: formData.job_id,
          estimate_id: formData.estimate_id || null,
          name: formData.name,
          generate_from_estimate: formData.generate_from_estimate && formData.estimate_id,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setShowForm(false);
        resetForm();
        loadSOVs();
      } else {
        alert(data.error || 'Failed to create SOV');
      }
    } catch (err) {
      console.error('Error creating SOV:', err);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this Schedule of Values and all line items?')) return;
    try {
      const res = await fetch(`/api/sov?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        loadSOVs();
      }
    } catch (err) {
      console.error('Error deleting SOV:', err);
    }
  }

  function resetForm() {
    setFormData({
      job_id: filterJob || '',
      estimate_id: '',
      name: 'Schedule of Values',
      generate_from_estimate: false,
    });
  }

  function getStatusColor(status: string) {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-700';
      case 'pending': return 'bg-yellow-100 text-yellow-700';
      case 'approved': return 'bg-green-100 text-green-700';
      case 'revised': return 'bg-blue-100 text-blue-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  }

  // Filter estimates by selected job
  const filteredEstimates = formData.job_id
    ? estimates.filter(e => e.job_id === formData.job_id)
    : estimates;

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Schedule of Values</h1>
            <p className="text-sm text-gray-600 mt-1">
              Track contract line items for progress billing and pay applications
            </p>
          </div>
          <button
            onClick={() => { resetForm(); setShowForm(true); }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
          >
            + New SOV
          </button>
        </div>

        {/* Filters */}
        <div className="mb-4">
          <select
            value={filterJob}
            onChange={(e) => setFilterJob(e.target.value)}
            className="px-3 py-2 border rounded-lg"
          >
            <option value="">All Jobs</option>
            {jobs.map(j => <option key={j.id} value={j.id}>{j.name}</option>)}
          </select>
        </div>

        {/* List */}
        {loading ? (
          <div className="bg-white rounded-lg shadow p-8 text-center text-gray-600">Loading...</div>
        ) : sovs.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center text-gray-600">
            No Schedule of Values found. Create one from an estimate or start fresh.
          </div>
        ) : (
          <div className="grid gap-4">
            {sovs.map((sov) => (
              <div key={sov.id} className="bg-white rounded-lg shadow p-5 hover:shadow-md transition-shadow">
                <div className="flex flex-col sm:flex-row justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(sov.status)}`}>
                        {sov.status}
                      </span>
                      <span className="text-sm text-gray-500">v{sov.version}</span>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900">{sov.name}</h3>
                    <div className="text-sm text-gray-600 mt-1">
                      Job: <Link href={`/jobs/${sov.job_id}`} className="text-blue-600 hover:underline">{sov.job_name || 'Unknown'}</Link>
                    </div>
                    <div className="text-sm text-gray-500 mt-1">
                      {sov.line_count} line items
                    </div>
                  </div>

                  <div className="flex flex-col sm:items-end gap-2">
                    <div className="text-xl font-bold text-gray-900">
                      ${sov.total_contract_amount.toLocaleString()}
                    </div>
                    {sov.approved_at && (
                      <div className="text-sm text-green-600">
                        Approved {new Date(sov.approved_at).toLocaleDateString()}
                      </div>
                    )}
                    <div className="flex gap-2 mt-2">
                      <Link
                        href={`/sov/${sov.id}`}
                        className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                      >
                        View/Edit
                      </Link>
                      {sov.status === 'draft' && (
                        <button
                          onClick={() => handleDelete(sov.id)}
                          className="px-3 py-1.5 text-red-600 hover:text-red-700 text-sm"
                        >
                          Delete
                        </button>
                      )}
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
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
              <div className="p-6 border-b">
                <h2 className="text-xl font-bold text-gray-900">Create Schedule of Values</h2>
              </div>
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Job *</label>
                  <select
                    value={formData.job_id}
                    onChange={(e) => setFormData({ ...formData, job_id: e.target.value, estimate_id: '' })}
                    required
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select Job</option>
                    {jobs.map(j => <option key={j.id} value={j.id}>{j.name}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Generate from Estimate</label>
                  <select
                    value={formData.estimate_id}
                    onChange={(e) => setFormData({
                      ...formData,
                      estimate_id: e.target.value,
                      generate_from_estimate: !!e.target.value,
                    })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    disabled={!formData.job_id}
                  >
                    <option value="">Start with blank SOV</option>
                    {filteredEstimates.map(e => (
                      <option key={e.id} value={e.id}>
                        {e.name || e.po_number || 'Estimate'} - ${e.total.toLocaleString()}
                      </option>
                    ))}
                  </select>
                  {formData.estimate_id && (
                    <p className="text-xs text-gray-500 mt-1">
                      Line items from the estimate will be copied to the SOV
                    </p>
                  )}
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
                    Create SOV
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
