'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Job } from '@/types/database';

interface UseJobsReturn {
  jobs: Job[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  createJob: (job: Partial<Job>) => Promise<Job | null>;
  updateJob: (id: string, updates: Partial<Job>) => Promise<Job | null>;
  deleteJob: (id: string) => Promise<boolean>;
  getJob: (id: string) => Promise<Job | null>;
}

// Demo data - impressive commercial jobs for presentations
const demoJobs: Job[] = [
  {
    id: 'demo-1',
    user_id: 'demo',
    name: 'Westfield Mall - Main Lot Seal & Stripe',
    client_name: 'Westfield Property Management',
    client_id: null,
    status: 'active',
    property_address: '1200 Mall Drive',
    city: 'Chicago',
    state: 'IL',
    zip: '60601',
    start_date: '2025-01-02',
    end_date: '2025-01-15',
    estimated_revenue: 87500,
    estimated_cost: 52000,
    actual_revenue: 43750,
    actual_cost: 28400,
    notes: '285,000 sq ft - Phase 1 of 2. Night work required. 50% deposit received.',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'demo-2',
    user_id: 'demo',
    name: 'O\'Hare Airport - Employee Lot C',
    client_name: 'Chicago Dept of Aviation',
    client_id: null,
    status: 'planned',
    property_address: '10000 W O\'Hare',
    city: 'Chicago',
    state: 'IL',
    zip: '60666',
    start_date: '2025-02-01',
    end_date: '2025-02-20',
    estimated_revenue: 156000,
    estimated_cost: 89000,
    actual_revenue: 0,
    actual_cost: 0,
    notes: '425,000 sq ft lot. Requires security clearance. FAA compliance specs.',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'demo-3',
    user_id: 'demo',
    name: 'Costco Distribution Center',
    client_name: 'Costco Wholesale',
    client_id: null,
    status: 'completed',
    property_address: '8800 Industrial Pkwy',
    city: 'Naperville',
    state: 'IL',
    zip: '60563',
    start_date: '2024-11-15',
    end_date: '2024-12-05',
    estimated_revenue: 125000,
    estimated_cost: 71500,
    actual_revenue: 125000,
    actual_cost: 68200,
    notes: '380,000 sq ft. Completed ahead of schedule. Client very satisfied - referral to 3 other locations.',
    created_at: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'demo-4',
    user_id: 'demo',
    name: 'Target Plaza - Full Resurface',
    client_name: 'Target Corporation',
    client_id: null,
    status: 'planned',
    property_address: '5500 Retail Way',
    city: 'Schaumburg',
    state: 'IL',
    zip: '60173',
    start_date: '2025-03-01',
    end_date: '2025-03-12',
    estimated_revenue: 68500,
    estimated_cost: 41000,
    actual_revenue: 0,
    actual_cost: 0,
    notes: '195,000 sq ft. Includes ADA compliance striping update.',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'demo-5',
    user_id: 'demo',
    name: 'Marriott Hotel Complex',
    client_name: 'Marriott International',
    client_id: null,
    status: 'active',
    property_address: '200 Convention Center Dr',
    city: 'Rosemont',
    state: 'IL',
    zip: '60018',
    start_date: '2024-12-26',
    end_date: '2025-01-10',
    estimated_revenue: 45000,
    estimated_cost: 26500,
    actual_revenue: 22500,
    actual_cost: 14200,
    notes: '145,000 sq ft across 3 connected lots. VIP entrance priority.',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

export function useJobs(userId: string | undefined): UseJobsReturn {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDemo, setIsDemo] = useState(false);

  const fetchJobs = useCallback(async () => {
    if (!userId) {
      setJobs(demoJobs);
      setIsDemo(true);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/jobs?user_id=${userId}`);
      const result = await res.json();

      if (result.success && result.data) {
        setJobs(result.data);
        setIsDemo(false);
      } else {
        console.error('Jobs fetch error:', result.error);
        setJobs(demoJobs);
        setIsDemo(true);
      }
    } catch (err) {
      console.error('Jobs fetch error:', err);
      setError('Failed to load jobs');
      setJobs(demoJobs);
      setIsDemo(true);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  const createJob = async (jobData: Partial<Job>): Promise<Job | null> => {
    if (!userId || isDemo) {
      const newJob: Job = {
        id: `demo-${Date.now()}`,
        user_id: userId || 'demo',
        name: jobData.name || 'New Job',
        client_name: jobData.client_name || null,
        client_id: jobData.client_id || null,
        status: jobData.status || 'planned',
        property_address: jobData.property_address || null,
        city: jobData.city || null,
        state: jobData.state || null,
        zip: jobData.zip || null,
        start_date: jobData.start_date || null,
        end_date: jobData.end_date || null,
        estimated_revenue: jobData.estimated_revenue || 0,
        estimated_cost: jobData.estimated_cost || 0,
        actual_revenue: jobData.actual_revenue || 0,
        actual_cost: jobData.actual_cost || 0,
        notes: jobData.notes || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      setJobs(prev => [newJob, ...prev]);
      return newJob;
    }

    try {
      const res = await fetch('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, ...jobData }),
      });
      const result = await res.json();

      if (result.success && result.data) {
        setJobs(prev => [result.data, ...prev]);
        return result.data;
      }
      throw new Error(result.error || 'Failed to create job');
    } catch (err) {
      console.error('Create job error:', err);
      setError('Failed to create job');
      return null;
    }
  };

  const updateJob = async (id: string, updates: Partial<Job>): Promise<Job | null> => {
    if (isDemo || id.startsWith('demo-')) {
      setJobs(prev => prev.map(job =>
        job.id === id
          ? { ...job, ...updates, updated_at: new Date().toISOString() }
          : job
      ));
      return jobs.find(j => j.id === id) || null;
    }

    try {
      const res = await fetch(`/api/jobs/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      const result = await res.json();

      if (result.success && result.data) {
        setJobs(prev => prev.map(job => job.id === id ? result.data : job));
        return result.data;
      }
      throw new Error(result.error || 'Failed to update job');
    } catch (err) {
      console.error('Update job error:', err);
      setError('Failed to update job');
      return null;
    }
  };

  const deleteJob = async (id: string): Promise<boolean> => {
    if (isDemo || id.startsWith('demo-')) {
      setJobs(prev => prev.filter(job => job.id !== id));
      return true;
    }

    try {
      const res = await fetch(`/api/jobs/${id}`, { method: 'DELETE' });
      const result = await res.json();

      if (result.success) {
        setJobs(prev => prev.filter(job => job.id !== id));
        return true;
      }
      throw new Error(result.error || 'Failed to delete job');
    } catch (err) {
      console.error('Delete job error:', err);
      setError('Failed to delete job');
      return false;
    }
  };

  const getJob = async (id: string): Promise<Job | null> => {
    // Check local state first
    const localJob = jobs.find(j => j.id === id);
    if (localJob) return localJob;

    if (isDemo || id.startsWith('demo-')) {
      return demoJobs.find(j => j.id === id) || null;
    }

    try {
      const res = await fetch(`/api/jobs/${id}`);
      const result = await res.json();

      if (result.success && result.data) {
        return result.data;
      }
      throw new Error(result.error || 'Job not found');
    } catch (err) {
      console.error('Get job error:', err);
      return null;
    }
  };

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  return {
    jobs,
    isLoading,
    error,
    refresh: fetchJobs,
    createJob,
    updateJob,
    deleteJob,
    getJob,
  };
}
