// Database types for Made Easy Suite

export interface Job {
  id: string;
  user_id: string;
  name: string;
  client_name: string | null;
  client_id: string | null;
  status: 'planned' | 'active' | 'completed' | 'cancelled';
  property_address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  start_date: string | null;
  end_date: string | null;
  estimated_revenue: number;
  estimated_cost: number;
  actual_revenue: number;
  actual_cost: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Estimate {
  id: string;
  user_id: string;
  job_id: string | null;
  client_name: string | null;
  client_email: string | null;
  client_phone: string | null;
  client_address: string | null;
  status: 'draft' | 'sent' | 'accepted' | 'declined' | 'expired';
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  total: number;
  valid_until: string | null;
  notes: string | null;
  terms: string | null;
  sent_at: string | null;
  accepted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface EstimateItem {
  id: string;
  estimate_id: string;
  description: string;
  quantity: number;
  unit: string | null;
  unit_price: number;
  total: number;
  is_optional: boolean;
  sort_order: number;
  created_at: string;
}

export interface Category {
  id: string;
  user_id: string | null;
  name: string;
  icon: string | null;
  color: string | null;
  deduction_percentage: number;
  is_default: boolean;
  created_at: string;
}

export interface Expense {
  id: string;
  user_id: string;
  job_id: string | null;
  category_id: string | null;
  description: string;
  amount: number;
  date: string;
  vendor: string | null;
  payment_method: string | null;
  is_business: boolean;
  receipt_url: string | null;
  notes: string | null;
  created_at: string;
  // Joined fields
  category_name?: string | null;
  job_name?: string | null;
}

export interface Invoice {
  id: string;
  user_id: string;
  job_id: string | null;
  client_name: string | null;
  client_email: string | null;
  invoice_number: string;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  total: number;
  due_date: string | null;
  sent_at: string | null;
  paid_at: string | null;
  notes: string | null;
  created_at: string;
}

export interface InvoiceItem {
  id: string;
  invoice_id: string;
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
  sort_order: number;
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

export interface Contact {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string | null;
  company: string | null;
  email: string | null;
  phone: string | null;
  mobile: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  type: 'lead' | 'prospect' | 'customer' | 'vendor' | 'partner' | 'other';
  status: 'new' | 'contacted' | 'qualified' | 'proposal' | 'negotiation' | 'won' | 'lost';
  source: string | null;
  deal_value: number | null;
  notes: string | null;
  last_contacted: string | null;
  created_at: string;
  updated_at: string;
}

// Alias for backwards compatibility
export type Lead = Contact;

export interface Mileage {
  id: string;
  user_id: string;
  job_id: string | null;
  date: string;
  start_location: string | null;
  end_location: string | null;
  distance: number;
  purpose: string | null;
  rate_per_mile: number;
  total_amount: number | null;
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
