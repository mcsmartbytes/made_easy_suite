'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';


type TimeRow = {
  id: string;
  date: string;
  hours: number;
  hourly_rate: number | null;
  description: string | null;
  notes: string | null;
  job_id: string | null;
  jobs: { name: string } | null;
};

type Job = {
  id: string;
  name: string;
};

export default function TimeTrackingPage() {
  const { user } = useAuth();
  const [rows, setRows] = useState<TimeRow[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [entryDate, setEntryDate] = useState(new Date().toISOString().split('T')[0]);
  const [hours, setHours] = useState('');
  const [hourlyRate, setHourlyRate] = useState('');
  const [notes, setNotes] = useState('');
  const [jobId, setJobId] = useState('');

  useEffect(() => {
    if (user?.id) {
      void loadData();
    }
  }, [user?.id]);

  async function loadData() {
    if (!user?.id) return;

    setLoading(true);
    try {
      // Load jobs for dropdown
      const jobsRes = await fetch(`/api/jobs?user_id=${user.id}`);
      const jobsData = await jobsRes.json();
      if (jobsData.success) {
        setJobs(jobsData.data || []);
      }

      // Load time entries
      const res = await fetch(`/api/time-entries?user_id=${user.id}`);
      const data = await res.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to load time entries');
      }

      setRows(data.data || []);
    } catch (err: any) {
      console.error('Error loading time entries:', err);
      setError(err.message || 'Failed to load time entries');
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setEditingId(null);
    setEntryDate(new Date().toISOString().split('T')[0]);
    setHours('');
    setHourlyRate('');
    setNotes('');
    setJobId('');
    setShowForm(false);
  }

  function handleEdit(entry: TimeRow) {
    setEditingId(entry.id);
    setEntryDate(entry.date);
    setHours(entry.hours.toString());
    setHourlyRate(entry.hourly_rate?.toString() || '');
    setNotes(entry.notes || '');
    setJobId(entry.job_id || '');
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user?.id || !hours) return;

    try {
      const payload = {
        user_id: user.id,
        date: entryDate,
        hours: parseFloat(hours),
        hourly_rate: hourlyRate ? parseFloat(hourlyRate) : null,
        notes: notes.trim() || null,
        job_id: jobId || null,
      };

      if (editingId) {
        const res = await fetch('/api/time-entries', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editingId, ...payload }),
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.error);
      } else {
        const res = await fetch('/api/time-entries', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.error);
      }

      resetForm();
      await loadData();
    } catch (err: any) {
      console.error('Error saving time entry:', err);
      setError(err.message || 'Failed to save time entry');
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this time entry?')) return;

    try {
      const res = await fetch(`/api/time-entries?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      await loadData();
    } catch (err: any) {
      console.error('Error deleting time entry:', err);
      setError(err.message || 'Failed to delete');
    }
  }

  const totalHours = rows.reduce((s, r) => s + r.hours, 0);
  const totalLaborCost = rows.reduce((s, r) => {
    if (!r.hourly_rate) return s;
    return s + r.hours * r.hourly_rate;
  }, 0);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="flex items-center justify-center py-24">
          <p className="text-gray-600">Loading time entries...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-5xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Time Tracking</h1>
            <p className="text-sm text-gray-600 mt-1">
              Total hours:{' '}
              <span className="font-semibold">{totalHours.toFixed(2)}</span> · Labor cost:{' '}
              <span className="font-semibold">${totalLaborCost.toFixed(2)}</span>
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => { resetForm(); setShowForm(true); }}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700"
            >
              + Log Time
            </button>
            <Link href="/jobs" className="text-sm text-blue-600 hover:text-blue-700 font-semibold self-center">
              Jobs
            </Link>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
            <button onClick={() => setError(null)} className="ml-2 underline">Dismiss</button>
          </div>
        )}

        {/* Add/Edit Form */}
        {showForm && (
          <section className="bg-white rounded-lg shadow p-5 mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              {editingId ? 'Edit Time Entry' : 'Log Time'}
            </h2>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Date *</label>
                <input
                  type="date"
                  value={entryDate}
                  onChange={(e) => setEntryDate(e.target.value)}
                  required
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Hours *</label>
                <input
                  type="number"
                  step="0.25"
                  min="0"
                  value={hours}
                  onChange={(e) => setHours(e.target.value)}
                  required
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Hourly Rate</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={hourlyRate}
                  onChange={(e) => setHourlyRate(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="$/hour"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Job (optional)</label>
                <select
                  value={jobId}
                  onChange={(e) => setJobId(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">No job</option>
                  {jobs.map(j => (
                    <option key={j.id} value={j.id}>{j.name}</option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-1">Notes</label>
                <input
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="What did you work on?"
                />
              </div>
              <div className="md:col-span-3 flex justify-end gap-3">
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
                  {editingId ? 'Update' : 'Log Time'}
                </button>
              </div>
            </form>
          </section>
        )}

        {rows.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-6 text-sm text-gray-500">
            No time entries yet. Log your first entry to start tracking hours.
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-2 text-left text-gray-600 font-medium">Date</th>
                  <th className="px-4 py-2 text-left text-gray-600 font-medium">Job</th>
                  <th className="px-4 py-2 text-left text-gray-600 font-medium">Hours</th>
                  <th className="px-4 py-2 text-left text-gray-600 font-medium">Rate</th>
                  <th className="px-4 py-2 text-left text-gray-600 font-medium">Cost</th>
                  <th className="px-4 py-2 text-left text-gray-600 font-medium">Notes</th>
                  <th className="px-4 py-2 text-right text-gray-600 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, idx) => (
                  <tr
                    key={r.id}
                    className={`border-t ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/40'}`}
                  >
                    <td className="px-4 py-2">
                      {new Date(r.date).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-2">
                      {r.job_id ? (
                        <Link
                          href={`/jobs/${r.job_id}`}
                          className="text-blue-600 hover:text-blue-700"
                        >
                          {r.jobs?.name || '(Unknown job)'}
                        </Link>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="px-4 py-2">{r.hours.toFixed(2)}</td>
                    <td className="px-4 py-2">
                      {r.hourly_rate !== null ? `$${r.hourly_rate.toFixed(2)}` : '—'}
                    </td>
                    <td className="px-4 py-2 font-medium text-green-600">
                      {r.hourly_rate !== null ? `$${(r.hours * r.hourly_rate).toFixed(2)}` : '—'}
                    </td>
                    <td className="px-4 py-2">
                      {r.notes ? <span className="line-clamp-2">{r.notes}</span> : '—'}
                    </td>
                    <td className="px-4 py-2 text-right">
                      <button
                        onClick={() => handleEdit(r)}
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium mr-3"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(r.id)}
                        className="text-red-600 hover:text-red-800 text-sm font-medium"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
