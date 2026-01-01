'use client';

import { useState } from 'react';
import { CalendarDays, Briefcase, Users, CheckSquare, RefreshCw } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useScheduling } from '@/hooks/useScheduling';
import { Calendar, ScheduleFilters, CalendarEvent } from '@/components/scheduling';
import type { CalendarItem } from '@/types/scheduling';

export default function SchedulingPage() {
  const { user } = useAuth();
  const {
    items,
    isLoading,
    error,
    currentDate,
    setCurrentDate,
    filters,
    setFilters,
    refresh,
  } = useScheduling({ userId: user?.id });

  const [selectedItem, setSelectedItem] = useState<CalendarItem | null>(null);

  const handleEventClick = (item: CalendarItem) => {
    setSelectedItem(item);
  };

  // Count items by type
  const jobCount = items.filter(i => i.type === 'job').length;
  const crewCount = items.filter(i => i.type === 'crew').length;
  const taskCount = items.filter(i => i.type === 'task').length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex items-center gap-3 text-gray-500">
          <RefreshCw className="w-5 h-5 animate-spin" />
          <span>Loading schedule...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <CalendarDays className="w-7 h-7 text-blue-600" />
            Scheduling
          </h1>
          <p className="text-gray-600 mt-1">
            View jobs, crew assignments, and tasks in one place
          </p>
        </div>
        <button
          onClick={refresh}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Briefcase className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-blue-700">{jobCount}</p>
              <p className="text-sm text-blue-600">Jobs</p>
            </div>
          </div>
        </div>
        <div className="bg-purple-50 border border-purple-100 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-purple-700">{crewCount}</p>
              <p className="text-sm text-purple-600">Crew Assignments</p>
            </div>
          </div>
        </div>
        <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
              <CheckSquare className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-amber-700">{taskCount}</p>
              <p className="text-sm text-amber-600">Tasks</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <ScheduleFilters filters={filters} onFiltersChange={setFilters} />
      </div>

      {/* Error message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Calendar */}
      <Calendar
        currentDate={currentDate}
        onDateChange={setCurrentDate}
        items={items}
        onEventClick={handleEventClick}
      />

      {/* Selected item detail panel */}
      {selectedItem && (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-900">Selected Item</h3>
            <button
              onClick={() => setSelectedItem(null)}
              className="text-gray-400 hover:text-gray-600 text-sm"
            >
              Close
            </button>
          </div>
          <CalendarEvent item={selectedItem} />
          <div className="mt-3 pt-3 border-t border-gray-100 text-sm text-gray-600 space-y-1">
            <p><span className="font-medium">Type:</span> {selectedItem.type}</p>
            <p><span className="font-medium">Status:</span> {selectedItem.status}</p>
            {selectedItem.startDate && (
              <p><span className="font-medium">Start:</span> {selectedItem.startDate.toLocaleDateString()}</p>
            )}
            {selectedItem.endDate && (
              <p><span className="font-medium">End:</span> {selectedItem.endDate.toLocaleDateString()}</p>
            )}
            {selectedItem.metadata.scheduledHours && (
              <p><span className="font-medium">Hours:</span> {selectedItem.metadata.scheduledHours}h</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
