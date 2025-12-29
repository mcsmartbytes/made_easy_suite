// Database types for Made Easy Suite

export interface Job {
  id: string;
  user_id: string;
  name: string;
  client_name: string | null;
  status: 'planned' | 'active' | 'completed' | 'cancelled';
  property_address: string | null;
  start_date: string | null;
  end_date: string | null;
  estimated_revenue: number | null;
  estimated_cost: number | null;
  actual_revenue: number | null;
  actual_cost: number | null;
  created_at: string;
  updated_at: string;
}

export interface Estimate {
  id: string;
  user_id: string;
  job_id: string | null;
  client_name: string | null;
  status: 'draft' | 'sent' | 'accepted' | 'declined' | 'expired';
  subtotal: number;
  tax_amount: number;
  total: number;
  valid_until: string | null;
  created_at: string;
}

export interface Expense {
  id: string;
  user_id: string;
  job_id: string | null;
  description: string;
  amount: number;
  date: string;
  vendor: string | null;
  category_id: string | null;
  category_name: string | null;
  is_business: boolean;
  receipt_url: string | null;
  created_at: string;
}

export interface Invoice {
  id: string;
  user_id: string;
  job_id: string | null;
  client_name: string | null;
  invoice_number: string;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  subtotal: number;
  tax_amount: number;
  total: number;
  due_date: string | null;
  paid_at: string | null;
  created_at: string;
}

export interface TimeEntry {
  id: string;
  user_id: string;
  job_id: string | null;
  entry_date: string;
  hours: number;
  hourly_rate: number | null;
  notes: string | null;
  created_at: string;
}

export interface Lead {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string | null;
  company: string | null;
  email: string | null;
  phone: string | null;
  status: 'new' | 'contacted' | 'qualified' | 'proposal' | 'negotiation' | 'won' | 'lost';
  source: string | null;
  created_at: string;
}

// Dashboard aggregates
export interface DashboardStats {
  activeJobs: number;
  revenueMonthToDate: number;
  revenueChange: number;
  profitMargin: number;
  profitMarginChange: number;
  quotesPending: number;
  quotesPendingValue: number;
  openLeads: number;
  leadsChange: number;
}

export interface ActionItem {
  label: string;
  count: number;
  href: string;
  priority: 'high' | 'medium' | 'low';
}

export interface ProfitRisk {
  job: string;
  jobId: string;
  issue: string;
  impact: string;
  severity: 'high' | 'medium' | 'low';
}

export interface EstimateVsActual {
  estimated: number;
  actual: number;
  variance: number;
  variancePercent: number;
}
