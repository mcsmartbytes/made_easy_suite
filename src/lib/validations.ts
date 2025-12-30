import { z } from 'zod';

// ============================================
// Common validators
// ============================================

export const idSchema = z.string().min(1, 'ID is required');
export const userIdSchema = z.string().min(1, 'User ID is required');
export const emailSchema = z.string().email('Invalid email format').optional().nullable();
export const phoneSchema = z.string().max(20).optional().nullable();
export const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)').optional().nullable();
export const moneySchema = z.number().min(0, 'Amount must be positive').optional().nullable();
export const percentSchema = z.number().min(0).max(100).optional().nullable();

// ============================================
// Jobs
// ============================================

export const createJobSchema = z.object({
  user_id: userIdSchema,
  name: z.string().min(1, 'Job name is required').max(200),
  client_name: z.string().max(200).optional().nullable(),
  status: z.enum(['active', 'completed', 'on-hold', 'cancelled']).default('active'),
  property_address: z.string().max(500).optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  state: z.string().max(2).optional().nullable(),
  zip: z.string().max(10).optional().nullable(),
  structure_type: z.string().max(100).optional().nullable(),
  roof_type: z.string().max(100).optional().nullable(),
  roof_pitch: z.string().max(50).optional().nullable(),
  layers: z.number().int().min(0).max(10).optional().nullable(),
  measured_squares: z.number().min(0).optional().nullable(),
  dumpster_size: z.string().max(50).optional().nullable(),
  dumpster_hauler: z.string().max(100).optional().nullable(),
  start_date: dateSchema,
  end_date: dateSchema,
  notes: z.string().max(5000).optional().nullable(),
});

export const updateJobSchema = createJobSchema.partial().extend({
  id: idSchema,
});

// ============================================
// Contacts
// ============================================

export const createContactSchema = z.object({
  user_id: userIdSchema,
  first_name: z.string().min(1, 'First name is required').max(100),
  last_name: z.string().max(100).optional().nullable(),
  company: z.string().max(200).optional().nullable(),
  email: emailSchema,
  phone: phoneSchema,
  mobile: phoneSchema,
  address: z.string().max(500).optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  state: z.string().max(2).optional().nullable(),
  zip: z.string().max(10).optional().nullable(),
  type: z.enum(['lead', 'prospect', 'customer', 'vendor', 'partner', 'other']).default('lead'),
  source: z.string().max(100).optional().nullable(),
  tags: z.string().max(500).optional().nullable(),
  notes: z.string().max(5000).optional().nullable(),
});

export const updateContactSchema = createContactSchema.partial().extend({
  id: idSchema,
  last_contacted: dateSchema,
});

// ============================================
// Crew Members
// ============================================

export const createCrewMemberSchema = z.object({
  user_id: userIdSchema,
  name: z.string().min(1, 'Name is required').max(200),
  role: z.string().max(100).optional().nullable(),
  type: z.enum(['employee', 'subcontractor', 'crew']).default('employee'),
  email: emailSchema,
  phone: phoneSchema,
  hourly_rate: moneySchema,
  specialty: z.string().max(200).optional().nullable(),
  license_number: z.string().max(100).optional().nullable(),
  insurance_expiry: dateSchema,
  notes: z.string().max(5000).optional().nullable(),
});

export const updateCrewMemberSchema = createCrewMemberSchema.partial().extend({
  id: idSchema,
  status: z.enum(['active', 'inactive']).optional(),
});

// ============================================
// Crew Assignments
// ============================================

export const createCrewAssignmentSchema = z.object({
  crew_member_id: idSchema,
  job_id: idSchema,
  phase_id: z.string().optional().nullable(),
  start_date: dateSchema,
  end_date: dateSchema,
  scheduled_hours: z.number().min(0).max(1000).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
});

export const updateCrewAssignmentSchema = createCrewAssignmentSchema.partial().extend({
  id: idSchema,
  status: z.enum(['scheduled', 'in_progress', 'completed', 'cancelled']).optional(),
});

// ============================================
// Estimates
// ============================================

export const createEstimateSchema = z.object({
  user_id: userIdSchema,
  job_id: idSchema,
  estimate_number: z.string().max(50).optional(),
  status: z.enum(['draft', 'sent', 'viewed', 'accepted', 'rejected', 'expired']).default('draft'),
  valid_until: dateSchema,
  subtotal: moneySchema,
  tax_rate: percentSchema,
  tax_amount: moneySchema,
  discount_percent: percentSchema,
  discount_amount: moneySchema,
  total: moneySchema,
  notes: z.string().max(5000).optional().nullable(),
  terms: z.string().max(5000).optional().nullable(),
  client_name: z.string().max(200).optional().nullable(),
  client_email: emailSchema,
  client_phone: phoneSchema,
  client_address: z.string().max(500).optional().nullable(),
});

export const updateEstimateSchema = createEstimateSchema.partial().extend({
  id: idSchema,
});

// ============================================
// Tools
// ============================================

export const createToolSchema = z.object({
  user_id: userIdSchema,
  name: z.string().min(1, 'Tool name is required').max(200),
  description: z.string().max(1000).optional().nullable(),
  category_id: z.string().optional().nullable(),
  brand: z.string().max(100).optional().nullable(),
  model: z.string().max(100).optional().nullable(),
  serial_number: z.string().max(100).optional().nullable(),
  asset_tag: z.string().max(50).optional().nullable(),
  purchase_date: dateSchema,
  purchase_price: moneySchema,
  current_value: moneySchema,
  warranty_expires: dateSchema,
  condition: z.enum(['excellent', 'good', 'fair', 'poor', 'needs_repair']).default('good'),
  home_location: z.string().max(200).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
});

export const updateToolSchema = createToolSchema.partial().extend({
  id: idSchema,
  status: z.enum(['available', 'checked_out', 'maintenance', 'retired', 'lost']).optional(),
});

// ============================================
// Tool Checkout
// ============================================

export const checkoutToolSchema = z.object({
  tool_id: idSchema,
  user_id: userIdSchema,
  checked_out_to: z.string().max(200).optional().nullable(),
  checked_out_to_job_id: z.string().optional().nullable(),
  checkout_location: z.string().max(200).optional().nullable(),
  checkout_notes: z.string().max(1000).optional().nullable(),
  expected_return_date: dateSchema,
  reminder_date: dateSchema,
});

export const checkinToolSchema = z.object({
  checkout_id: z.string().optional(),
  tool_id: z.string().optional(),
  checkin_location: z.string().max(200).optional().nullable(),
  checkin_condition: z.enum(['excellent', 'good', 'fair', 'poor', 'needs_repair']).optional().nullable(),
  checkin_notes: z.string().max(1000).optional().nullable(),
}).refine(data => data.checkout_id || data.tool_id, {
  message: 'Either checkout_id or tool_id is required',
});

// ============================================
// Time Entries
// ============================================

export const createTimeEntrySchema = z.object({
  user_id: userIdSchema,
  job_id: idSchema,
  phase_id: z.string().optional().nullable(),
  crew_member_id: z.string().optional().nullable(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date is required'),
  hours: z.number().min(0.01).max(24, 'Hours must be between 0 and 24'),
  hourly_rate: moneySchema,
  description: z.string().max(1000).optional().nullable(),
  billable: z.boolean().default(true),
});

export const updateTimeEntrySchema = createTimeEntrySchema.partial().extend({
  id: idSchema,
});

// ============================================
// Expenses
// ============================================

export const createExpenseSchema = z.object({
  user_id: userIdSchema,
  job_id: z.string().optional().nullable(),
  category_id: z.string().optional().nullable(),
  amount: z.number().min(0.01, 'Amount is required'),
  description: z.string().min(1, 'Description is required').max(500),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date is required'),
  vendor: z.string().max(200).optional().nullable(),
  receipt_url: z.string().url().optional().nullable(),
  is_billable: z.boolean().default(false),
  is_reimbursable: z.boolean().default(false),
  notes: z.string().max(2000).optional().nullable(),
});

export const updateExpenseSchema = createExpenseSchema.partial().extend({
  id: idSchema,
});

// ============================================
// Email
// ============================================

export const sendEmailSchema = z.object({
  to: z.union([z.string().email(), z.array(z.string().email())]),
  subject: z.string().min(1, 'Subject is required').max(200),
  body: z.string().min(1, 'Body is required').max(50000),
  from_name: z.string().max(100).optional(),
  reply_to: z.string().email().optional(),
});

// ============================================
// Auth
// ============================================

export const loginSchema = z.object({
  email: z.string().email('Valid email is required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const registerSchema = z.object({
  email: z.string().email('Valid email is required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  full_name: z.string().min(1, 'Name is required').max(200),
  company_name: z.string().max(200).optional().nullable(),
});

// ============================================
// Validation helper
// ============================================

export function validateRequest<T>(schema: z.ZodSchema<T>, data: unknown): { success: true; data: T } | { success: false; error: string } {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  const errors = result.error.issues.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
  return { success: false, error: errors };
}
