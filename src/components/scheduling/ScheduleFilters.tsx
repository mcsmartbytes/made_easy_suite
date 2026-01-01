'use client';

import { Briefcase, Users, CheckSquare, Filter } from 'lucide-react';
import type { SchedulingFilters } from '@/types/scheduling';

interface ScheduleFiltersProps {
  filters: SchedulingFilters;
  onFiltersChange: (filters: Partial<SchedulingFilters>) => void;
}

export function ScheduleFilters({ filters, onFiltersChange }: ScheduleFiltersProps) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <div className="flex items-center gap-1 text-sm text-gray-500">
        <Filter className="w-4 h-4" />
        <span>Show:</span>
      </div>

      {/* Jobs toggle */}
      <button
        onClick={() => onFiltersChange({ showJobs: !filters.showJobs })}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
          filters.showJobs
            ? 'bg-blue-100 text-blue-700 border border-blue-200'
            : 'bg-gray-100 text-gray-500 border border-gray-200'
        }`}
      >
        <Briefcase className="w-4 h-4" />
        Jobs
      </button>

      {/* Crew toggle */}
      <button
        onClick={() => onFiltersChange({ showCrew: !filters.showCrew })}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
          filters.showCrew
            ? 'bg-purple-100 text-purple-700 border border-purple-200'
            : 'bg-gray-100 text-gray-500 border border-gray-200'
        }`}
      >
        <Users className="w-4 h-4" />
        Crew
      </button>

      {/* Tasks toggle */}
      <button
        onClick={() => onFiltersChange({ showTasks: !filters.showTasks })}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
          filters.showTasks
            ? 'bg-amber-100 text-amber-700 border border-amber-200'
            : 'bg-gray-100 text-gray-500 border border-gray-200'
        }`}
      >
        <CheckSquare className="w-4 h-4" />
        Tasks
      </button>
    </div>
  );
}
