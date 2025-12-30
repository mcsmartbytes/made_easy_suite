'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Pencil,
  Trash2,
  MapPin,
  Calendar,
  DollarSign,
  Clock,
  FileText,
  Plus,
  Receipt,
  Car,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useJobs } from '@/hooks/useJobs';
import type { Job } from '@/types/database';

const statusStyles: Record<string, string> = {
  planned: 'bg-gray-100 text-gray-700',
  active: 'bg-blue-100 text-blue-700',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
};

const statusLabels: Record<string, string> = {
  planned: 'Planned',
  active: 'Active',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

export default function JobDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const { jobs, getJob, updateJob, deleteJob } = useJobs(user?.id);
  const [job, setJob] = useState<Job | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  const jobId = params.id as string;

  useEffect(() => {
    const fetchJob = async () => {
      setIsLoading(true);
      const foundJob = await getJob(jobId);
      setJob(foundJob);
      setIsLoading(false);
    };
    fetchJob();
  }, [jobId, getJob]);

  const handleStatusChange = async (newStatus: Job['status']) => {
    if (!job) return;
    const updated = await updateJob(job.id, { status: newStatus });
    if (updated) {
      setJob(updated);
    }
  };

  const handleDelete = async () => {
    if (!job) return;
    const success = await deleteJob(job.id);
    if (success) {
      router.push('/jobs');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

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

  // Calculate financials
  const estimatedProfit = job.estimated_revenue - job.estimated_cost;
  const actualProfit = job.actual_revenue - job.actual_cost;
  const estimatedMargin = job.estimated_revenue > 0
    ? Math.round((estimatedProfit / job.estimated_revenue) * 100)
    : 0;
  const actualMargin = job.actual_revenue > 0
    ? Math.round((actualProfit / job.actual_revenue) * 100)
    : 0;

  const costVariance = job.actual_cost - job.estimated_cost;
  const costVariancePercent = job.estimated_cost > 0
    ? Math.round((costVariance / job.estimated_cost) * 100)
    : 0;

  const isOverBudget = job.actual_cost > job.estimated_cost && job.estimated_cost > 0;

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
        <div className="flex items-start gap-4">
          <Link
            href="/jobs"
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors mt-1"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </Link>
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold text-gray-900">{job.name}</h1>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusStyles[job.status]}`}>
                {statusLabels[job.status]}
              </span>
            </div>
            {job.client_name && (
              <p className="text-gray-600 mt-1">{job.client_name}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 ml-12 sm:ml-0">
          <Link
            href={`/jobs/${job.id}/edit`}
            className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg font-medium transition-colors"
          >
            <Pencil className="w-4 h-4" /> Edit
          </Link>
          <button
            onClick={() => setDeleteConfirm(true)}
            className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg font-medium transition-colors"
          >
            <Trash2 className="w-4 h-4" /> Delete
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Financial Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-sm text-gray-500 mb-1">Est. Revenue</p>
              <p className="text-xl font-bold text-gray-900">{formatCurrency(job.estimated_revenue)}</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-sm text-gray-500 mb-1">Est. Cost</p>
              <p className="text-xl font-bold text-gray-900">{formatCurrency(job.estimated_cost)}</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-sm text-gray-500 mb-1">Est. Profit</p>
              <p className={`text-xl font-bold ${estimatedProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(estimatedProfit)}
              </p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-sm text-gray-500 mb-1">Est. Margin</p>
              <p className={`text-xl font-bold ${estimatedMargin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {estimatedMargin}%
              </p>
            </div>
          </div>

          {/* Actual vs Estimated */}
          {(job.actual_revenue > 0 || job.actual_cost > 0) && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Actual vs Estimated</h2>
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4 text-sm font-medium text-gray-500 border-b border-gray-100 pb-2">
                  <div></div>
                  <div className="text-right">Estimated</div>
                  <div className="text-right">Actual</div>
                </div>
                <div className="grid grid-cols-3 gap-4 items-center">
                  <div className="text-gray-700 font-medium">Revenue</div>
                  <div className="text-right text-gray-900">{formatCurrency(job.estimated_revenue)}</div>
                  <div className="text-right text-gray-900 font-medium">{formatCurrency(job.actual_revenue)}</div>
                </div>
                <div className="grid grid-cols-3 gap-4 items-center">
                  <div className="text-gray-700 font-medium">Cost</div>
                  <div className="text-right text-gray-900">{formatCurrency(job.estimated_cost)}</div>
                  <div className={`text-right font-medium ${isOverBudget ? 'text-red-600' : 'text-gray-900'}`}>
                    {formatCurrency(job.actual_cost)}
                    {isOverBudget && (
                      <span className="ml-2 text-xs text-red-600">+{costVariancePercent}%</span>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4 items-center pt-2 border-t border-gray-100">
                  <div className="text-gray-700 font-medium">Profit</div>
                  <div className={`text-right ${estimatedProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(estimatedProfit)}
                  </div>
                  <div className={`text-right font-medium ${actualProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(actualProfit)}
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4 items-center">
                  <div className="text-gray-700 font-medium">Margin</div>
                  <div className={`text-right ${estimatedMargin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {estimatedMargin}%
                  </div>
                  <div className={`text-right font-medium ${actualMargin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {actualMargin}%
                  </div>
                </div>
              </div>

              {isOverBudget && (
                <div className="mt-4 p-3 bg-red-50 border border-red-100 rounded-lg flex items-start gap-2">
                  <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-red-800">Over Budget Warning</p>
                    <p className="text-sm text-red-700">
                      This job is {formatCurrency(costVariance)} ({costVariancePercent}%) over the estimated cost.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Notes */}
          {job.notes && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-3">Notes</h2>
              <p className="text-gray-700 whitespace-pre-wrap">{job.notes}</p>
            </div>
          )}

          {/* Related Items */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Related Items</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Link
                href={`/expenses?job=${job.id}`}
                className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Receipt className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">Expenses</p>
                  <p className="text-sm text-gray-500">View expenses for this job</p>
                </div>
              </Link>
              <Link
                href={`/mileage?job=${job.id}`}
                className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Car className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">Mileage</p>
                  <p className="text-sm text-gray-500">View trips for this job</p>
                </div>
              </Link>
              <Link
                href={`/books?job=${job.id}`}
                className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <FileText className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">Invoices</p>
                  <p className="text-sm text-gray-500">View invoices for this job</p>
                </div>
              </Link>
              <button
                onClick={() => alert('Time tracking coming soon!')}
                className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left"
              >
                <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <Clock className="w-5 h-5 text-yellow-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">Time Entries</p>
                  <p className="text-sm text-gray-500">Log hours for this job</p>
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Job Details */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Job Details</h2>
            <div className="space-y-4">
              {job.property_address && (
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500">Location</p>
                    <p className="text-gray-900">
                      {job.property_address}
                      {job.city && <>, {job.city}</>}
                      {job.state && <>, {job.state}</>}
                      {job.zip && <> {job.zip}</>}
                    </p>
                  </div>
                </div>
              )}

              <div className="flex items-start gap-3">
                <Calendar className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-500">Schedule</p>
                  <p className="text-gray-900">
                    {formatDate(job.start_date)}
                    {job.end_date && <> to {formatDate(job.end_date)}</>}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Clock className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-500">Created</p>
                  <p className="text-gray-900">{formatDate(job.created_at)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Status Update */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Update Status</h2>
            <div className="space-y-2">
              {(['planned', 'active', 'completed', 'cancelled'] as const).map(status => (
                <button
                  key={status}
                  onClick={() => handleStatusChange(status)}
                  className={`w-full text-left px-4 py-2.5 rounded-lg font-medium transition-colors ${
                    job.status === status
                      ? `${statusStyles[status]} ring-2 ring-offset-2 ring-blue-500`
                      : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {statusLabels[status]}
                </button>
              ))}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
            <div className="space-y-2">
              <Link
                href={`/expenses?job=${job.id}&new=true`}
                className="flex items-center gap-2 w-full px-4 py-2.5 bg-purple-50 text-purple-700 rounded-lg font-medium hover:bg-purple-100 transition-colors"
              >
                <Plus className="w-4 h-4" /> Add Expense
              </Link>
              <Link
                href={`/books?job=${job.id}&new=invoice`}
                className="flex items-center gap-2 w-full px-4 py-2.5 bg-green-50 text-green-700 rounded-lg font-medium hover:bg-green-100 transition-colors"
              >
                <Plus className="w-4 h-4" /> Create Invoice
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Job?</h3>
            <p className="text-gray-600 mb-4">
              Are you sure you want to delete &quot;{job.name}&quot;? This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteConfirm(false)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
