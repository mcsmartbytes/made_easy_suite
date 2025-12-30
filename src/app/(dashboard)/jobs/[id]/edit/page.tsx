'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useJobs } from '@/hooks/useJobs';
import type { Job } from '@/types/database';

export default function EditJobPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const { getJob, updateJob } = useJobs(user?.id);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [job, setJob] = useState<Job | null>(null);

  const jobId = params.id as string;

  const [formData, setFormData] = useState({
    name: '',
    client_name: '',
    status: 'planned' as Job['status'],
    property_address: '',
    city: '',
    state: '',
    zip: '',
    start_date: '',
    end_date: '',
    estimated_revenue: '',
    estimated_cost: '',
    actual_revenue: '',
    actual_cost: '',
    notes: '',
  });

  useEffect(() => {
    const fetchJob = async () => {
      setIsLoading(true);
      const foundJob = await getJob(jobId);
      if (foundJob) {
        setJob(foundJob);
        setFormData({
          name: foundJob.name || '',
          client_name: foundJob.client_name || '',
          status: foundJob.status,
          property_address: foundJob.property_address || '',
          city: foundJob.city || '',
          state: foundJob.state || '',
          zip: foundJob.zip || '',
          start_date: foundJob.start_date || '',
          end_date: foundJob.end_date || '',
          estimated_revenue: foundJob.estimated_revenue?.toString() || '',
          estimated_cost: foundJob.estimated_cost?.toString() || '',
          actual_revenue: foundJob.actual_revenue?.toString() || '',
          actual_cost: foundJob.actual_cost?.toString() || '',
          notes: foundJob.notes || '',
        });
      }
      setIsLoading(false);
    };
    fetchJob();
  }, [jobId, getJob]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.name.trim()) {
      setError('Job name is required');
      return;
    }

    setIsSubmitting(true);

    try {
      const updated = await updateJob(jobId, {
        name: formData.name,
        client_name: formData.client_name || null,
        status: formData.status,
        property_address: formData.property_address || null,
        city: formData.city || null,
        state: formData.state || null,
        zip: formData.zip || null,
        start_date: formData.start_date || null,
        end_date: formData.end_date || null,
        estimated_revenue: parseFloat(formData.estimated_revenue) || 0,
        estimated_cost: parseFloat(formData.estimated_cost) || 0,
        actual_revenue: parseFloat(formData.actual_revenue) || 0,
        actual_cost: parseFloat(formData.actual_cost) || 0,
        notes: formData.notes || null,
      });

      if (updated) {
        router.push(`/jobs/${jobId}`);
      } else {
        setError('Failed to update job. Please try again.');
      }
    } catch (err) {
      console.error('Update job error:', err);
      setError('Failed to update job. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const estimatedProfit = (parseFloat(formData.estimated_revenue) || 0) - (parseFloat(formData.estimated_cost) || 0);
  const estimatedMargin = parseFloat(formData.estimated_revenue) > 0
    ? Math.round((estimatedProfit / parseFloat(formData.estimated_revenue)) * 100)
    : 0;

  const actualProfit = (parseFloat(formData.actual_revenue) || 0) - (parseFloat(formData.actual_cost) || 0);
  const actualMargin = parseFloat(formData.actual_revenue) > 0
    ? Math.round((actualProfit / parseFloat(formData.actual_revenue)) * 100)
    : 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Job not found</h2>
        <p className="text-gray-600 mb-4">The job you&apos;re looking for doesn&apos;t exist.</p>
        <Link href="/jobs" className="text-blue-600 hover:text-blue-700 font-medium">
          Back to Jobs
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link
          href={`/jobs/${jobId}`}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Edit Job</h1>
          <p className="text-gray-600">{job.name}</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h2>
          <div className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                Job Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label htmlFor="client_name" className="block text-sm font-medium text-gray-700 mb-1">
                Client Name
              </label>
              <input
                type="text"
                id="client_name"
                name="client_name"
                value={formData.client_name}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                id="status"
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="planned">Planned</option>
                <option value="active">Active</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>
        </div>

        {/* Location */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Location</h2>
          <div className="space-y-4">
            <div>
              <label htmlFor="property_address" className="block text-sm font-medium text-gray-700 mb-1">
                Property Address
              </label>
              <input
                type="text"
                id="property_address"
                name="property_address"
                value={formData.property_address}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="col-span-2">
                <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-1">
                  City
                </label>
                <input
                  type="text"
                  id="city"
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label htmlFor="state" className="block text-sm font-medium text-gray-700 mb-1">
                  State
                </label>
                <input
                  type="text"
                  id="state"
                  name="state"
                  value={formData.state}
                  onChange={handleChange}
                  maxLength={2}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label htmlFor="zip" className="block text-sm font-medium text-gray-700 mb-1">
                  ZIP
                </label>
                <input
                  type="text"
                  id="zip"
                  name="zip"
                  value={formData.zip}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Schedule */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Schedule</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="start_date" className="block text-sm font-medium text-gray-700 mb-1">
                Start Date
              </label>
              <input
                type="date"
                id="start_date"
                name="start_date"
                value={formData.start_date}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label htmlFor="end_date" className="block text-sm font-medium text-gray-700 mb-1">
                End Date
              </label>
              <input
                type="date"
                id="end_date"
                name="end_date"
                value={formData.end_date}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Estimated Financials */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Estimated Financials</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="estimated_revenue" className="block text-sm font-medium text-gray-700 mb-1">
                Estimated Revenue
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                <input
                  type="number"
                  id="estimated_revenue"
                  name="estimated_revenue"
                  value={formData.estimated_revenue}
                  onChange={handleChange}
                  step="0.01"
                  min="0"
                  className="w-full pl-8 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div>
              <label htmlFor="estimated_cost" className="block text-sm font-medium text-gray-700 mb-1">
                Estimated Cost
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                <input
                  type="number"
                  id="estimated_cost"
                  name="estimated_cost"
                  value={formData.estimated_cost}
                  onChange={handleChange}
                  step="0.01"
                  min="0"
                  className="w-full pl-8 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {(parseFloat(formData.estimated_revenue) > 0 || parseFloat(formData.estimated_cost) > 0) && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Estimated Profit:</span>
                <span className={`font-semibold ${estimatedProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  ${estimatedProfit.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between items-center mt-1">
                <span className="text-sm text-gray-600">Estimated Margin:</span>
                <span className={`font-semibold ${estimatedMargin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {estimatedMargin}%
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Actual Financials */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Actual Financials</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="actual_revenue" className="block text-sm font-medium text-gray-700 mb-1">
                Actual Revenue
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                <input
                  type="number"
                  id="actual_revenue"
                  name="actual_revenue"
                  value={formData.actual_revenue}
                  onChange={handleChange}
                  step="0.01"
                  min="0"
                  className="w-full pl-8 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div>
              <label htmlFor="actual_cost" className="block text-sm font-medium text-gray-700 mb-1">
                Actual Cost
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                <input
                  type="number"
                  id="actual_cost"
                  name="actual_cost"
                  value={formData.actual_cost}
                  onChange={handleChange}
                  step="0.01"
                  min="0"
                  className="w-full pl-8 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {(parseFloat(formData.actual_revenue) > 0 || parseFloat(formData.actual_cost) > 0) && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Actual Profit:</span>
                <span className={`font-semibold ${actualProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  ${actualProfit.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between items-center mt-1">
                <span className="text-sm text-gray-600">Actual Margin:</span>
                <span className={`font-semibold ${actualMargin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {actualMargin}%
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Notes */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Notes</h2>
          <textarea
            id="notes"
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            rows={4}
            placeholder="Add any notes about this job..."
            className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
        </div>

        {/* Actions */}
        <div className="flex gap-4 justify-end">
          <Link
            href={`/jobs/${jobId}`}
            className="px-6 py-2.5 text-gray-700 hover:bg-gray-100 rounded-lg font-medium transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={isSubmitting}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-6 py-2.5 rounded-lg font-medium flex items-center gap-2 transition-colors"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" /> Save Changes
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
