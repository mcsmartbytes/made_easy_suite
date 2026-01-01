'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { startOfMonth, endOfMonth, format, parseISO } from 'date-fns';
import type { CalendarItem, SchedulingFilters, SchedulingApiResponse } from '@/types/scheduling';

// Demo data for presentation mode
const getDemoData = (startDate: Date, endDate: Date) => {
  const baseDate = startOfMonth(new Date());

  return {
    jobs: [
      {
        id: 'demo-job-1',
        name: 'Westfield Mall - Main Lot',
        client_name: 'Westfield Property Management',
        status: 'active',
        start_date: format(new Date(baseDate.getFullYear(), baseDate.getMonth(), 6), 'yyyy-MM-dd'),
        end_date: format(new Date(baseDate.getFullYear(), baseDate.getMonth(), 15), 'yyyy-MM-dd'),
      },
      {
        id: 'demo-job-2',
        name: "O'Hare Employee Lot C",
        client_name: 'Chicago Dept of Aviation',
        status: 'active',
        start_date: format(new Date(baseDate.getFullYear(), baseDate.getMonth(), 12), 'yyyy-MM-dd'),
        end_date: format(new Date(baseDate.getFullYear(), baseDate.getMonth(), 22), 'yyyy-MM-dd'),
      },
      {
        id: 'demo-job-3',
        name: 'Costco Distribution Center',
        client_name: 'Costco Wholesale',
        status: 'planned',
        start_date: format(new Date(baseDate.getFullYear(), baseDate.getMonth(), 20), 'yyyy-MM-dd'),
        end_date: format(new Date(baseDate.getFullYear(), baseDate.getMonth(), 28), 'yyyy-MM-dd'),
      },
    ],
    crewAssignments: [
      {
        id: 'demo-assign-1',
        crew_member_id: 'crew-1',
        crew_member_name: 'Mike Rodriguez',
        job_id: 'demo-job-1',
        job_name: 'Westfield Mall - Main Lot',
        phase_name: 'Sealcoating',
        start_date: format(new Date(baseDate.getFullYear(), baseDate.getMonth(), 6), 'yyyy-MM-dd'),
        end_date: format(new Date(baseDate.getFullYear(), baseDate.getMonth(), 10), 'yyyy-MM-dd'),
        scheduled_hours: 40,
        status: 'scheduled',
      },
      {
        id: 'demo-assign-2',
        crew_member_id: 'crew-2',
        crew_member_name: 'Carlos Martinez',
        job_id: 'demo-job-2',
        job_name: "O'Hare Employee Lot C",
        phase_name: 'Crack Filling',
        start_date: format(new Date(baseDate.getFullYear(), baseDate.getMonth(), 12), 'yyyy-MM-dd'),
        end_date: format(new Date(baseDate.getFullYear(), baseDate.getMonth(), 16), 'yyyy-MM-dd'),
        scheduled_hours: 32,
        status: 'scheduled',
      },
      {
        id: 'demo-assign-3',
        crew_member_id: 'crew-1',
        crew_member_name: 'Mike Rodriguez',
        job_id: 'demo-job-2',
        job_name: "O'Hare Employee Lot C",
        phase_name: 'Striping',
        start_date: format(new Date(baseDate.getFullYear(), baseDate.getMonth(), 18), 'yyyy-MM-dd'),
        end_date: format(new Date(baseDate.getFullYear(), baseDate.getMonth(), 20), 'yyyy-MM-dd'),
        scheduled_hours: 24,
        status: 'scheduled',
      },
    ],
    tasks: [
      {
        id: 'demo-task-1',
        job_id: 'demo-job-1',
        job_name: 'Westfield Mall - Main Lot',
        title: 'Equipment inspection',
        due_date: format(new Date(baseDate.getFullYear(), baseDate.getMonth(), 5), 'yyyy-MM-dd'),
        assigned_to: null,
        status: 'todo',
        priority: 'high',
      },
      {
        id: 'demo-task-2',
        job_id: 'demo-job-2',
        job_name: "O'Hare Employee Lot C",
        title: 'Safety briefing',
        due_date: format(new Date(baseDate.getFullYear(), baseDate.getMonth(), 11), 'yyyy-MM-dd'),
        assigned_to: null,
        status: 'todo',
        priority: 'medium',
      },
      {
        id: 'demo-task-3',
        job_id: 'demo-job-3',
        job_name: 'Costco Distribution Center',
        title: 'Submit permit application',
        due_date: format(new Date(baseDate.getFullYear(), baseDate.getMonth(), 18), 'yyyy-MM-dd'),
        assigned_to: null,
        status: 'todo',
        priority: 'high',
      },
    ],
  };
};

// Transform API data to CalendarItems
function transformToCalendarItems(data: SchedulingApiResponse['data']): CalendarItem[] {
  const items: CalendarItem[] = [];

  // Transform jobs
  for (const job of data.jobs) {
    items.push({
      id: job.id,
      type: 'job',
      title: job.name,
      subtitle: job.client_name || undefined,
      startDate: job.start_date ? parseISO(job.start_date) : null,
      endDate: job.end_date ? parseISO(job.end_date) : null,
      status: job.status,
      metadata: {
        jobId: job.id,
        jobName: job.name,
        clientName: job.client_name || undefined,
      },
    });
  }

  // Transform crew assignments
  for (const assignment of data.crewAssignments) {
    items.push({
      id: assignment.id,
      type: 'crew',
      title: assignment.crew_member_name,
      subtitle: assignment.job_name,
      startDate: assignment.start_date ? parseISO(assignment.start_date) : null,
      endDate: assignment.end_date ? parseISO(assignment.end_date) : null,
      status: assignment.status,
      metadata: {
        jobId: assignment.job_id,
        jobName: assignment.job_name,
        crewMemberId: assignment.crew_member_id,
        crewMemberName: assignment.crew_member_name,
        phaseName: assignment.phase_name || undefined,
        scheduledHours: assignment.scheduled_hours || undefined,
      },
    });
  }

  // Transform tasks
  for (const task of data.tasks) {
    items.push({
      id: task.id,
      type: 'task',
      title: task.title,
      subtitle: task.job_name,
      startDate: task.due_date ? parseISO(task.due_date) : null,
      endDate: task.due_date ? parseISO(task.due_date) : null,
      status: task.status,
      priority: task.priority as 'low' | 'medium' | 'high',
      metadata: {
        jobId: task.job_id,
        jobName: task.job_name,
      },
    });
  }

  return items;
}

interface UseSchedulingOptions {
  userId?: string;
  initialDate?: Date;
}

export function useScheduling(options: UseSchedulingOptions = {}) {
  const { userId, initialDate = new Date() } = options;

  const [currentDate, setCurrentDate] = useState(initialDate);
  const [items, setItems] = useState<CalendarItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<SchedulingFilters>({
    showJobs: true,
    showCrew: true,
    showTasks: true,
  });

  // Calculate date range for API call
  const dateRange = useMemo(() => ({
    start: startOfMonth(currentDate),
    end: endOfMonth(currentDate),
  }), [currentDate]);

  // Fetch data
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Check for demo mode
      const isDemoMode = typeof window !== 'undefined' &&
        localStorage.getItem('demoSession') === 'true';

      if (isDemoMode || !userId) {
        // Use demo data
        const demoData = getDemoData(dateRange.start, dateRange.end);
        const calendarItems = transformToCalendarItems(demoData);
        setItems(calendarItems);
        setIsLoading(false);
        return;
      }

      // Fetch from API
      const params = new URLSearchParams({
        user_id: userId,
        start_date: format(dateRange.start, 'yyyy-MM-dd'),
        end_date: format(dateRange.end, 'yyyy-MM-dd'),
      });

      const response = await fetch(`/api/scheduling?${params}`);
      const result: SchedulingApiResponse = await response.json();

      if (!result.success) {
        throw new Error(result.data ? 'Failed to fetch' : 'Unknown error');
      }

      const calendarItems = transformToCalendarItems(result.data);
      setItems(calendarItems);
    } catch (err: any) {
      console.error('Error fetching scheduling data:', err);
      setError(err.message || 'Failed to load schedule');
      // Fall back to demo data on error
      const demoData = getDemoData(dateRange.start, dateRange.end);
      setItems(transformToCalendarItems(demoData));
    } finally {
      setIsLoading(false);
    }
  }, [userId, dateRange]);

  // Fetch on mount and when date range changes
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Filter items based on current filters
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      if (item.type === 'job' && !filters.showJobs) return false;
      if (item.type === 'crew' && !filters.showCrew) return false;
      if (item.type === 'task' && !filters.showTasks) return false;
      if (filters.jobId && item.metadata.jobId !== filters.jobId) return false;
      if (filters.crewMemberId && item.metadata.crewMemberId !== filters.crewMemberId) return false;
      if (filters.status && filters.status !== 'all' && item.status !== filters.status) return false;
      return true;
    });
  }, [items, filters]);

  // Update filters
  const updateFilters = useCallback((newFilters: Partial<SchedulingFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  }, []);

  return {
    items: filteredItems,
    allItems: items,
    isLoading,
    error,
    currentDate,
    setCurrentDate,
    dateRange,
    filters,
    setFilters: updateFilters,
    refresh: fetchData,
  };
}
