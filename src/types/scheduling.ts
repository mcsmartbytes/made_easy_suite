export type CalendarItemType = 'job' | 'crew' | 'task';

export interface CalendarItem {
  id: string;
  type: CalendarItemType;
  title: string;
  subtitle?: string;
  startDate: Date | null;
  endDate: Date | null;
  status: string;
  priority?: 'low' | 'medium' | 'high';
  metadata: {
    jobId?: string;
    jobName?: string;
    crewMemberId?: string;
    crewMemberName?: string;
    phaseId?: string;
    phaseName?: string;
    clientName?: string;
    scheduledHours?: number;
  };
}

export interface SchedulingFilters {
  showJobs: boolean;
  showCrew: boolean;
  showTasks: boolean;
  jobId?: string;
  crewMemberId?: string;
  status?: 'all' | 'planned' | 'active' | 'completed';
}

export interface SchedulingApiResponse {
  success: boolean;
  data: {
    jobs: Array<{
      id: string;
      name: string;
      client_name: string | null;
      status: string;
      start_date: string | null;
      end_date: string | null;
    }>;
    crewAssignments: Array<{
      id: string;
      crew_member_id: string;
      crew_member_name: string;
      job_id: string;
      job_name: string;
      phase_name: string | null;
      start_date: string | null;
      end_date: string | null;
      scheduled_hours: number | null;
      status: string;
    }>;
    tasks: Array<{
      id: string;
      job_id: string;
      job_name: string;
      title: string;
      due_date: string | null;
      assigned_to: string | null;
      status: string;
      priority: string;
    }>;
  };
}
