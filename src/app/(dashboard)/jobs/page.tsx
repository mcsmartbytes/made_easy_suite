'use client';

import { useState } from 'react';
import { Plus, Search, Filter, MoreVertical, MapPin, Calendar, DollarSign } from 'lucide-react';
import Link from 'next/link';

export default function JobsPage() {
  const [filter, setFilter] = useState('all');

  const jobs = [
    { id: 1, name: 'Johnson Residence - Driveway Seal', customer: 'Mike Johnson', address: '123 Oak St, Springfield', status: 'in_progress', value: 3200, cost: 2310, date: '2024-12-28' },
    { id: 2, name: 'ABC Corp Parking Lot', customer: 'ABC Corporation', address: '500 Business Park Dr', status: 'scheduled', value: 12500, cost: 0, date: '2025-01-05' },
    { id: 3, name: 'Smith Property Striping', customer: 'Tom Smith', address: '789 Elm Ave', status: 'completed', value: 1800, cost: 1180, date: '2024-12-20' },
    { id: 4, name: 'City Mall - Section B', customer: 'City Mall LLC', address: '100 Mall Way', status: 'estimate', value: 8500, cost: 0, date: '2024-12-30' },
  ];

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      estimate: 'bg-gray-100 text-gray-700',
      scheduled: 'bg-yellow-100 text-yellow-700',
      in_progress: 'bg-blue-100 text-blue-700',
      completed: 'bg-green-100 text-green-700',
    };
    const labels: Record<string, string> = {
      estimate: 'Estimate',
      scheduled: 'Scheduled',
      in_progress: 'In Progress',
      completed: 'Completed',
    };
    return <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status]}`}>{labels[status]}</span>;
  };

  const filteredJobs = filter === 'all' ? jobs : jobs.filter(j => j.status === filter);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Jobs</h1>
          <p className="text-gray-600">Manage your jobs and track profitability</p>
        </div>
        <Link
          href="/jobs/new"
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg font-medium flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> New Job
        </Link>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search jobs..."
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-lg">
          {['all', 'estimate', 'scheduled', 'in_progress', 'completed'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                filter === f ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1).replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Jobs List */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="divide-y divide-gray-100">
          {filteredJobs.map((job) => (
            <Link key={job.id} href={`/jobs/${job.id}`} className="block hover:bg-gray-50 transition-colors">
              <div className="p-5">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold text-gray-900">{job.name}</h3>
                      {getStatusBadge(job.status)}
                    </div>
                    <p className="text-gray-600 mt-1">{job.customer}</p>
                    <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-4 h-4" /> {job.address}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" /> {new Date(job.date).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-semibold text-gray-900">${job.value.toLocaleString()}</p>
                    {job.cost > 0 && (
                      <p className="text-sm text-green-600 font-medium">
                        +${(job.value - job.cost).toLocaleString()} profit
                      </p>
                    )}
                    {job.cost > 0 && (
                      <p className="text-xs text-gray-500">
                        {Math.round(((job.value - job.cost) / job.value) * 100)}% margin
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
