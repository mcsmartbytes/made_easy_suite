'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';

import ProtectedRoute from '@/components/ProtectedRoute';

type Job = {
  id: string;
  name: string;
  client_name: string | null;
  status: string | null;
  created_at: string;
  industry_name?: string | null;
  industries?: { name: string }[] | null;
  estimated_revenue?: number;
  estimated_cost?: number;
  property_address?: string;
};

type Industry = { id: string; name: string };

// Demo jobs for presentation mode
const demoJobs: Job[] = [
  {
    id: 'demo-1',
    name: 'Westfield Mall - Main Lot Seal & Stripe',
    client_name: 'Westfield Property Management',
    status: 'active',
    created_at: new Date().toISOString(),
    industry_name: 'Sealcoating',
    estimated_revenue: 87500,
    estimated_cost: 52000,
    property_address: '1200 Mall Drive, Chicago, IL',
  },
  {
    id: 'demo-2',
    name: 'O\'Hare Airport - Employee Lot C',
    client_name: 'Chicago Dept of Aviation',
    status: 'planned',
    created_at: new Date().toISOString(),
    industry_name: 'Sealcoating',
    estimated_revenue: 156000,
    estimated_cost: 89000,
    property_address: '10000 W O\'Hare, Chicago, IL',
  },
  {
    id: 'demo-3',
    name: 'Costco Distribution Center',
    client_name: 'Costco Wholesale',
    status: 'completed',
    created_at: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
    industry_name: 'Sealcoating',
    estimated_revenue: 125000,
    estimated_cost: 71500,
    property_address: '8800 Industrial Pkwy, Naperville, IL',
  },
  {
    id: 'demo-4',
    name: 'Target Plaza - Full Resurface',
    client_name: 'Target Corporation',
    status: 'planned',
    created_at: new Date().toISOString(),
    industry_name: 'Sealcoating',
    estimated_revenue: 68500,
    estimated_cost: 41000,
    property_address: '5500 Retail Way, Schaumburg, IL',
  },
  {
    id: 'demo-5',
    name: 'Marriott Hotel Complex',
    client_name: 'Marriott International',
    status: 'active',
    created_at: new Date().toISOString(),
    industry_name: 'Sealcoating',
    estimated_revenue: 45000,
    estimated_cost: 26500,
    property_address: '200 Convention Center Dr, Rosemont, IL',
  },
];

function JobsPageContent() {
  const { user } = useAuth();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPresentationMode, setIsPresentationMode] = useState(false);

  const [name, setName] = useState('');
  const [clientName, setClientName] = useState('');
  const [status, setStatus] = useState('active');
  const [industries, setIndustries] = useState<Industry[]>([]);
  const [industryId, setIndustryId] = useState('');
  // Roofing-specific fields
  const [propertyAddress, setPropertyAddress] = useState('');
  const [structureType, setStructureType] = useState('');
  const [roofType, setRoofType] = useState('');
  const [roofPitch, setRoofPitch] = useState('');
  const [layers, setLayers] = useState('');
  const [squares, setSquares] = useState('');
  const [dumpsterSize, setDumpsterSize] = useState('');
  const [dumpsterHauler, setDumpsterHauler] = useState('');

  useEffect(() => {
    // Check for presentation mode
    const demoMode = localStorage.getItem('presentationMode') === 'true';
    setIsPresentationMode(demoMode);

    if (demoMode) {
      setJobs(demoJobs);
      setLoading(false);
    } else if (user) {
      void loadData();
    }
  }, [user]);

  async function loadData() {
    setLoading(true);
    setError(null);

    try {
      // Load industries
      const indRes = await fetch('/api/industries');
      const indData = await indRes.json();
      if (indData.success) {
        setIndustries(indData.data || []);
      }

      // Load jobs
      const jobRes = await fetch(`/api/jobs?user_id=${user?.id}`);
      const jobData = await jobRes.json();
      if (jobData.success) {
        setJobs(jobData.data || []);
      } else {
        setError(jobData.error || 'Failed to load jobs');
      }
    } catch (err) {
      console.error('Error loading data:', err);
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateJob(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !user) return;

    setError(null);

    try {
      const res = await fetch('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user.id,
          name: name.trim(),
          client_name: clientName.trim() || null,
          status: status || 'active',
          industry_id: industryId || null,
          property_address: propertyAddress || null,
          structure_type: structureType || null,
          roof_type: roofType || null,
          roof_pitch: roofPitch || null,
          layers: layers ? Number(layers) : null,
          measured_squares: squares ? Number(squares) : null,
          dumpster_size: dumpsterSize || null,
          dumpster_hauler: dumpsterHauler || null,
        }),
      });

      const data = await res.json();

      if (data.success) {
        // Reset form
        setName('');
        setClientName('');
        setStatus('active');
        setIndustryId('');
        setPropertyAddress('');
        setStructureType('');
        setRoofType('');
        setRoofPitch('');
        setLayers('');
        setSquares('');
        setDumpsterSize('');
        setDumpsterHauler('');
        await loadData();
      } else {
        setError(data.error || 'Failed to create job');
      }
    } catch (err) {
      console.error('Error creating job:', err);
      setError('Failed to create job');
    }
  }

  const selectedIndustry = industries.find(i => i.id === industryId);
  const isRoofing = selectedIndustry?.name === 'Roofing';

  return (
    <div className="min-h-screen bg-gray-50">
      

      <main className="max-w-6xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Jobs</h1>
            <p className="text-sm text-gray-600 mt-1">
              Create jobs and link expenses and time entries to track true job cost.
            </p>
          </div>

          <Link
            href="/"
            className="text-sm text-blue-600 hover:text-blue-700 font-semibold"
          >
            ← Back to Dashboard
          </Link>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
            <button onClick={() => setError(null)} className="ml-2 underline">Dismiss</button>
          </div>
        )}

        {/* Add Job form */}
        <section className="bg-white rounded-lg shadow p-5 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Add Job</h2>

          <form onSubmit={handleCreateJob} className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-1">
              <label className="block text-sm font-medium mb-1">Job Name *</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., Smith Driveway Resurface"
              />
            </div>

            <div className="md:col-span-1">
              <label className="block text-sm font-medium mb-1">Client Name</label>
              <input
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., John Smith"
              />
            </div>

            <div className="md:col-span-1">
              <label className="block text-sm font-medium mb-1">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="planned">Planned</option>
                <option value="active">Active</option>
                <option value="completed">Completed</option>
              </select>
            </div>

            <div className="md:col-span-1">
              <label className="block text-sm font-medium mb-1">Industry</label>
              <select
                value={industryId}
                onChange={(e) => setIndustryId(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select industry</option>
                {industries.map((i) => (
                  <option key={i.id} value={i.id}>{i.name}</option>
                ))}
              </select>
            </div>

            {/* Roofing-specific quick fields */}
            {isRoofing && (
              <>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-1">Property Address</label>
                  <input
                    value={propertyAddress}
                    onChange={(e) => setPropertyAddress(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="123 Main St, City, ST"
                  />
                </div>
                <div className="md:col-span-1">
                  <label className="block text-sm font-medium mb-1">Structure Type</label>
                  <input
                    value={structureType}
                    onChange={(e) => setStructureType(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="House / Multi-family / Commercial"
                  />
                </div>
                <div className="md:col-span-1">
                  <label className="block text-sm font-medium mb-1">Roof Type</label>
                  <input
                    value={roofType}
                    onChange={(e) => setRoofType(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Shingle / Metal / Tile / Flat"
                  />
                </div>
                <div className="md:col-span-1">
                  <label className="block text-sm font-medium mb-1">Roof Pitch</label>
                  <input
                    value={roofPitch}
                    onChange={(e) => setRoofPitch(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., 6/12"
                  />
                </div>
                <div className="md:col-span-1">
                  <label className="block text-sm font-medium mb-1">Layers</label>
                  <input
                    type="number"
                    min="0"
                    value={layers}
                    onChange={(e) => setLayers(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., 1"
                  />
                </div>
                <div className="md:col-span-1">
                  <label className="block text-sm font-medium mb-1">Measured Squares</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={squares}
                    onChange={(e) => setSquares(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., 28.5"
                  />
                </div>
                <div className="md:col-span-1">
                  <label className="block text-sm font-medium mb-1">Dumpster Size</label>
                  <input
                    value={dumpsterSize}
                    onChange={(e) => setDumpsterSize(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., 20 yd"
                  />
                </div>
                <div className="md:col-span-1">
                  <label className="block text-sm font-medium mb-1">Hauler</label>
                  <input
                    value={dumpsterHauler}
                    onChange={(e) => setDumpsterHauler(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Company name"
                  />
                </div>
              </>
            )}

            <div className="md:col-span-4 flex justify-end">
              <button
                type="submit"
                className="px-5 py-2.5 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700"
              >
                Save Job
              </button>
            </div>
          </form>
        </section>

        {/* Jobs list */}
        <section className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-4 py-3 border-b flex justify-between items-center">
            <h2 className="font-semibold text-gray-900">All Jobs ({jobs.length})</h2>
            {loading && <p className="text-xs text-gray-500">Loading...</p>}
          </div>

          {jobs.length === 0 && !loading ? (
            <div className="p-6 text-sm text-gray-500">
              No jobs yet. Add your first job above to start tracking expenses by job.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-2 text-left text-gray-600 font-medium">Job</th>
                    <th className="px-4 py-2 text-left text-gray-600 font-medium">Client</th>
                    <th className="px-4 py-2 text-left text-gray-600 font-medium">Industry</th>
                    <th className="px-4 py-2 text-left text-gray-600 font-medium">Status</th>
                    <th className="px-4 py-2 text-left text-gray-600 font-medium">Created</th>
                    <th className="px-4 py-2 text-right text-gray-600 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {jobs.map((job, idx) => (
                    <tr
                      key={job.id}
                      className={`border-t ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/40'}`}
                    >
                      <td className="px-4 py-2 font-medium text-gray-900">{job.name}</td>
                      <td className="px-4 py-2 text-gray-700">
                        {job.client_name || '—'}
                      </td>
                      <td className="px-4 py-2 text-gray-700">
                        {job.industry_name || (job.industries && job.industries[0]?.name) || '—'}
                      </td>
                      <td className="px-4 py-2 capitalize">
                        <span
                          className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                            job.status === 'completed'
                              ? 'bg-green-100 text-green-800'
                              : job.status === 'planned'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {job.status || 'active'}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-gray-600">
                        {new Date(job.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-2 text-right">
                        <Link
                          href={`/jobs/${job.id}`}
                          className="text-blue-600 hover:text-blue-800 text-sm font-semibold"
                        >
                          View Details
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export default function JobsPage() {
  return (
    <ProtectedRoute>
      <JobsPageContent />
    </ProtectedRoute>
  );
}
