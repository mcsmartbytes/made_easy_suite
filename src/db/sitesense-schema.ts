import { sqliteTable, text, integer, real, index } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

// =====================================================
// USERS
// =====================================================

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  email: text('email').unique().notNull(),
  password_hash: text('password_hash'),
  full_name: text('full_name'),
  company_name: text('company_name'),
  created_at: text('created_at').default(sql`(datetime('now'))`),
});

// =====================================================
// INDUSTRIES
// =====================================================

export const industries = sqliteTable('industries', {
  id: text('id').primaryKey(),
  name: text('name').unique().notNull(),
  description: text('description'),
  created_at: text('created_at').default(sql`(datetime('now'))`),
});

// =====================================================
// CLIENTS
// =====================================================

export const clients = sqliteTable('clients', {
  id: text('id').primaryKey(),
  user_id: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  email: text('email'),
  phone: text('phone'),
  address: text('address'),
  city: text('city'),
  state: text('state'),
  zip: text('zip'),
  notes: text('notes'),
  created_at: text('created_at').default(sql`(datetime('now'))`),
});

// =====================================================
// JOBS
// =====================================================

export const jobs = sqliteTable('jobs', {
  id: text('id').primaryKey(),
  user_id: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  client_id: text('client_id').references(() => clients.id, { onDelete: 'set null' }),
  client_name: text('client_name'),
  industry_id: text('industry_id').references(() => industries.id, { onDelete: 'set null' }),
  status: text('status', { enum: ['planned', 'active', 'completed', 'cancelled'] }).default('active'),
  property_address: text('property_address'),
  city: text('city'),
  state: text('state'),
  zip: text('zip'),
  structure_type: text('structure_type'),
  roof_type: text('roof_type'),
  roof_pitch: text('roof_pitch'),
  layers: integer('layers'),
  measured_squares: real('measured_squares'),
  dumpster_size: text('dumpster_size'),
  dumpster_hauler: text('dumpster_hauler'),
  start_date: text('start_date'),
  end_date: text('end_date'),
  notes: text('notes'),
  created_at: text('created_at').default(sql`(datetime('now'))`),
  updated_at: text('updated_at').default(sql`(datetime('now'))`),
}, (table) => [
  index('idx_jobs_user_id').on(table.user_id),
  index('idx_jobs_status').on(table.status),
]);

// =====================================================
// JOB PHASES
// =====================================================

export const jobPhases = sqliteTable('job_phases', {
  id: text('id').primaryKey(),
  job_id: text('job_id').notNull().references(() => jobs.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description'),
  sort_order: integer('sort_order').default(0),
  status: text('status', { enum: ['pending', 'in_progress', 'completed'] }).default('pending'),
  created_at: text('created_at').default(sql`(datetime('now'))`),
});

// =====================================================
// JOB TASKS
// =====================================================

export const jobTasks = sqliteTable('job_tasks', {
  id: text('id').primaryKey(),
  job_id: text('job_id').notNull().references(() => jobs.id, { onDelete: 'cascade' }),
  phase_id: text('phase_id').references(() => jobPhases.id, { onDelete: 'set null' }),
  name: text('name').notNull(),
  description: text('description'),
  status: text('status', { enum: ['todo', 'in_progress', 'blocked', 'done'] }).default('todo'),
  assignee: text('assignee'),
  due_date: text('due_date'),
  estimated_hours: real('estimated_hours'),
  sort_order: integer('sort_order').default(0),
  notes: text('notes'),
  created_at: text('created_at').default(sql`(datetime('now'))`),
});

// =====================================================
// PERMITS
// =====================================================

export const permits = sqliteTable('permits', {
  id: text('id').primaryKey(),
  job_id: text('job_id').notNull().references(() => jobs.id, { onDelete: 'cascade' }),
  permit_number: text('permit_number'),
  authority: text('authority'),
  status: text('status', { enum: ['draft', 'applied', 'approved', 'rejected', 'closed'] }).default('draft'),
  applied_date: text('applied_date'),
  approved_date: text('approved_date'),
  inspection_date: text('inspection_date'),
  notes: text('notes'),
  created_at: text('created_at').default(sql`(datetime('now'))`),
});

// =====================================================
// JOB MATERIALS
// =====================================================

export const jobMaterials = sqliteTable('job_materials', {
  id: text('id').primaryKey(),
  job_id: text('job_id').notNull().references(() => jobs.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  quantity: real('quantity'),
  unit: text('unit'),
  unit_cost: real('unit_cost'),
  vendor: text('vendor'),
  notes: text('notes'),
  created_at: text('created_at').default(sql`(datetime('now'))`),
});

// =====================================================
// JOB PHOTOS
// =====================================================

export const jobPhotos = sqliteTable('job_photos', {
  id: text('id').primaryKey(),
  job_id: text('job_id').notNull().references(() => jobs.id, { onDelete: 'cascade' }),
  url: text('url').notNull(),
  category: text('category', { enum: ['before', 'during', 'after', 'other'] }).default('other'),
  caption: text('caption'),
  created_at: text('created_at').default(sql`(datetime('now'))`),
});

// =====================================================
// WEATHER DELAYS
// =====================================================

export const weatherDelays = sqliteTable('weather_delays', {
  id: text('id').primaryKey(),
  job_id: text('job_id').notNull().references(() => jobs.id, { onDelete: 'cascade' }),
  delay_date: text('delay_date').notNull(),
  hours_lost: real('hours_lost'),
  notes: text('notes'),
  created_at: text('created_at').default(sql`(datetime('now'))`),
});

// =====================================================
// TIME ENTRIES
// =====================================================

export const timeEntries = sqliteTable('time_entries', {
  id: text('id').primaryKey(),
  user_id: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  job_id: text('job_id').references(() => jobs.id, { onDelete: 'set null' }),
  entry_date: text('entry_date').notNull(),
  hours: real('hours').notNull(),
  hourly_rate: real('hourly_rate'),
  notes: text('notes'),
  created_at: text('created_at').default(sql`(datetime('now'))`),
}, (table) => [
  index('idx_time_entries_user_id').on(table.user_id),
  index('idx_time_entries_job_id').on(table.job_id),
]);

// =====================================================
// CATEGORIES
// =====================================================

export const categories = sqliteTable('categories', {
  id: text('id').primaryKey(),
  user_id: text('user_id').references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  icon: text('icon'),
  color: text('color'),
  deduction_percentage: integer('deduction_percentage').default(100),
  is_default: integer('is_default').default(0),
  created_at: text('created_at').default(sql`(datetime('now'))`),
});

// =====================================================
// EXPENSES
// =====================================================

export const expenses = sqliteTable('expenses', {
  id: text('id').primaryKey(),
  user_id: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  job_id: text('job_id').references(() => jobs.id, { onDelete: 'set null' }),
  category_id: text('category_id').references(() => categories.id, { onDelete: 'set null' }),
  description: text('description').notNull(),
  amount: real('amount').notNull(),
  date: text('date').notNull(),
  vendor: text('vendor'),
  payment_method: text('payment_method'),
  is_business: integer('is_business').default(1),
  receipt_url: text('receipt_url'),
  notes: text('notes'),
  created_at: text('created_at').default(sql`(datetime('now'))`),
}, (table) => [
  index('idx_expenses_user_id').on(table.user_id),
  index('idx_expenses_job_id').on(table.job_id),
]);

// =====================================================
// ESTIMATES
// =====================================================

export const estimates = sqliteTable('estimates', {
  id: text('id').primaryKey(),
  user_id: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  job_id: text('job_id').references(() => jobs.id, { onDelete: 'set null' }),
  client_name: text('client_name'),
  client_email: text('client_email'),
  client_phone: text('client_phone'),
  client_address: text('client_address'),
  status: text('status', { enum: ['draft', 'sent', 'accepted', 'declined', 'expired'] }).default('draft'),
  subtotal: real('subtotal').default(0),
  tax_rate: real('tax_rate').default(0),
  tax_amount: real('tax_amount').default(0),
  total: real('total').default(0),
  po_number: text('po_number'),
  valid_until: text('valid_until'),
  notes: text('notes'),
  terms: text('terms'),
  public_token: text('public_token').unique(),
  sent_at: text('sent_at'),
  accepted_at: text('accepted_at'),
  created_at: text('created_at').default(sql`(datetime('now'))`),
  updated_at: text('updated_at').default(sql`(datetime('now'))`),
}, (table) => [
  index('idx_estimates_user_id').on(table.user_id),
  index('idx_estimates_job_id').on(table.job_id),
]);

// =====================================================
// ESTIMATE ITEMS
// =====================================================

export const estimateItems = sqliteTable('estimate_items', {
  id: text('id').primaryKey(),
  estimate_id: text('estimate_id').notNull().references(() => estimates.id, { onDelete: 'cascade' }),
  description: text('description').notNull(),
  quantity: real('quantity').default(1),
  unit_price: real('unit_price').default(0),
  total: real('total').default(0),
  is_optional: integer('is_optional').default(0),
  sort_order: integer('sort_order').default(0),
  created_at: text('created_at').default(sql`(datetime('now'))`),
});

// =====================================================
// ESTIMATE ATTACHMENTS
// =====================================================

export const estimateAttachments = sqliteTable('estimate_attachments', {
  id: text('id').primaryKey(),
  estimate_id: text('estimate_id').notNull().references(() => estimates.id, { onDelete: 'cascade' }),
  url: text('url').notNull(),
  filename: text('filename'),
  created_at: text('created_at').default(sql`(datetime('now'))`),
});

// =====================================================
// CHANGE ORDERS
// =====================================================

export const changeOrders = sqliteTable('change_orders', {
  id: text('id').primaryKey(),
  job_id: text('job_id').notNull().references(() => jobs.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  description: text('description'),
  amount: real('amount').default(0),
  status: text('status', { enum: ['draft', 'proposed', 'approved', 'rejected', 'invoiced', 'paid'] }).default('draft'),
  approved_at: text('approved_at'),
  created_at: text('created_at').default(sql`(datetime('now'))`),
});

// =====================================================
// TOOL CATEGORIES
// =====================================================

export const toolCategories = sqliteTable('tool_categories', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  icon: text('icon'),
  color: text('color'),
  created_at: text('created_at').default(sql`(datetime('now'))`),
});

// =====================================================
// TOOLS
// =====================================================

export const tools = sqliteTable('tools', {
  id: text('id').primaryKey(),
  user_id: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description'),
  category_id: text('category_id').references(() => toolCategories.id, { onDelete: 'set null' }),
  brand: text('brand'),
  model: text('model'),
  serial_number: text('serial_number'),
  qr_code: text('qr_code').unique(),
  asset_tag: text('asset_tag'),
  purchase_date: text('purchase_date'),
  purchase_price: real('purchase_price'),
  current_value: real('current_value'),
  warranty_expires: text('warranty_expires'),
  status: text('status', { enum: ['available', 'checked_out', 'maintenance', 'retired', 'lost'] }).default('available'),
  condition: text('condition', { enum: ['excellent', 'good', 'fair', 'poor', 'needs_repair'] }).default('good'),
  home_location: text('home_location'),
  current_location: text('current_location'),
  assigned_to_user: text('assigned_to_user'),
  assigned_to_job: text('assigned_to_job').references(() => jobs.id, { onDelete: 'set null' }),
  assigned_at: text('assigned_at'),
  image_url: text('image_url'),
  notes: text('notes'),
  created_at: text('created_at').default(sql`(datetime('now'))`),
  updated_at: text('updated_at').default(sql`(datetime('now'))`),
}, (table) => [
  index('idx_tools_user_id').on(table.user_id),
  index('idx_tools_qr_code').on(table.qr_code),
  index('idx_tools_status').on(table.status),
]);

// =====================================================
// TOOL CHECKOUTS
// =====================================================

export const toolCheckouts = sqliteTable('tool_checkouts', {
  id: text('id').primaryKey(),
  tool_id: text('tool_id').notNull().references(() => tools.id, { onDelete: 'cascade' }),
  user_id: text('user_id').references(() => users.id, { onDelete: 'set null' }),
  checked_out_at: text('checked_out_at').notNull().default(sql`(datetime('now'))`),
  checked_out_to: text('checked_out_to'),
  checked_out_to_job_id: text('checked_out_to_job_id').references(() => jobs.id, { onDelete: 'set null' }),
  checkout_notes: text('checkout_notes'),
  checkout_condition: text('checkout_condition'),
  checkout_location: text('checkout_location'),
  expected_return_date: text('expected_return_date'),
  reminder_date: text('reminder_date'),
  checked_in_at: text('checked_in_at'),
  checkin_notes: text('checkin_notes'),
  checkin_condition: text('checkin_condition'),
  checkin_location: text('checkin_location'),
  created_at: text('created_at').default(sql`(datetime('now'))`),
}, (table) => [
  index('idx_tool_checkouts_tool_id').on(table.tool_id),
]);

// =====================================================
// TOOL MAINTENANCE
// =====================================================

export const toolMaintenance = sqliteTable('tool_maintenance', {
  id: text('id').primaryKey(),
  tool_id: text('tool_id').notNull().references(() => tools.id, { onDelete: 'cascade' }),
  user_id: text('user_id').references(() => users.id, { onDelete: 'set null' }),
  maintenance_type: text('maintenance_type', { enum: ['inspection', 'repair', 'calibration', 'cleaning', 'replacement', 'other'] }).notNull(),
  description: text('description').notNull(),
  performed_by: text('performed_by'),
  performed_at: text('performed_at').notNull().default(sql`(date('now'))`),
  cost: real('cost'),
  vendor: text('vendor'),
  status: text('status', { enum: ['scheduled', 'in_progress', 'completed', 'cancelled'] }).default('completed'),
  next_maintenance_date: text('next_maintenance_date'),
  receipt_url: text('receipt_url'),
  notes: text('notes'),
  created_at: text('created_at').default(sql`(datetime('now'))`),
});

// =====================================================
// CREW MEMBERS
// =====================================================

export const crewMembers = sqliteTable('crew_members', {
  id: text('id').primaryKey(),
  user_id: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  phone: text('phone'),
  email: text('email'),
  role: text('role'),
  type: text('type', { enum: ['employee', 'subcontractor', 'crew'] }).default('employee'),
  hourly_rate: real('hourly_rate'),
  specialty: text('specialty'),
  license_number: text('license_number'),
  insurance_expiry: text('insurance_expiry'),
  is_active: integer('is_active').default(1),
  notes: text('notes'),
  created_at: text('created_at').default(sql`(datetime('now'))`),
});

// =====================================================
// CONTACTS
// =====================================================

export const contacts = sqliteTable('contacts', {
  id: text('id').primaryKey(),
  user_id: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  first_name: text('first_name').notNull(),
  last_name: text('last_name'),
  company: text('company'),
  email: text('email'),
  phone: text('phone'),
  mobile: text('mobile'),
  address: text('address'),
  city: text('city'),
  state: text('state'),
  zip: text('zip'),
  type: text('type', { enum: ['lead', 'prospect', 'customer', 'vendor', 'partner', 'other'] }).default('lead'),
  source: text('source'),
  tags: text('tags'),
  notes: text('notes'),
  last_contacted: text('last_contacted'),
  created_at: text('created_at').default(sql`(datetime('now'))`),
});

// =====================================================
// CSI COST CODES (MasterFormat-based)
// =====================================================

export const costCodes = sqliteTable('cost_codes', {
  id: text('id').primaryKey(),
  code: text('code').notNull(), // e.g., "03 30 00" for Cast-in-Place Concrete
  division: text('division').notNull(), // e.g., "03" for Concrete
  name: text('name').notNull(),
  description: text('description'),
  parent_code: text('parent_code'), // For hierarchical structure
  level: integer('level').default(1), // 1=Division, 2=Section, 3=Subsection
  is_default: integer('is_default').default(1), // Default CSI codes
  user_id: text('user_id').references(() => users.id, { onDelete: 'cascade' }), // User custom codes
  created_at: text('created_at').default(sql`(datetime('now'))`),
}, (table) => [
  index('idx_cost_codes_code').on(table.code),
  index('idx_cost_codes_division').on(table.division),
]);

// =====================================================
// SUBCONTRACTORS (Extended compliance tracking)
// =====================================================

export const subcontractors = sqliteTable('subcontractors', {
  id: text('id').primaryKey(),
  user_id: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  company_name: text('company_name').notNull(),
  contact_name: text('contact_name'),
  email: text('email'),
  phone: text('phone'),
  address: text('address'),
  city: text('city'),
  state: text('state'),
  zip: text('zip'),
  // Trade/specialty info
  primary_trade: text('primary_trade'), // e.g., "Electrical", "Plumbing"
  csi_divisions: text('csi_divisions'), // JSON array of CSI divisions they work in
  // Compliance tracking
  license_number: text('license_number'),
  license_state: text('license_state'),
  license_expiry: text('license_expiry'),
  license_verified: integer('license_verified').default(0),
  // Insurance
  insurance_company: text('insurance_company'),
  insurance_policy_number: text('insurance_policy_number'),
  insurance_expiry: text('insurance_expiry'),
  insurance_amount: real('insurance_amount'),
  coi_on_file: integer('coi_on_file').default(0), // Certificate of Insurance
  additional_insured: integer('additional_insured').default(0),
  waiver_of_subrogation: integer('waiver_of_subrogation').default(0),
  // Tax/compliance
  w9_on_file: integer('w9_on_file').default(0),
  tax_id: text('tax_id'),
  // Workers comp
  workers_comp_policy: text('workers_comp_policy'),
  workers_comp_expiry: text('workers_comp_expiry'),
  // Safety
  safety_plan_on_file: integer('safety_plan_on_file').default(0),
  osha_certified: integer('osha_certified').default(0),
  emr_rating: real('emr_rating'), // Experience Modification Rate
  // Performance
  rating: integer('rating'), // 1-5 stars
  projects_completed: integer('projects_completed').default(0),
  is_preferred: integer('is_preferred').default(0),
  is_active: integer('is_active').default(1),
  notes: text('notes'),
  created_at: text('created_at').default(sql`(datetime('now'))`),
  updated_at: text('updated_at').default(sql`(datetime('now'))`),
}, (table) => [
  index('idx_subcontractors_user_id').on(table.user_id),
  index('idx_subcontractors_trade').on(table.primary_trade),
]);

// =====================================================
// SUBCONTRACTOR DOCUMENTS
// =====================================================

export const subcontractorDocuments = sqliteTable('subcontractor_documents', {
  id: text('id').primaryKey(),
  subcontractor_id: text('subcontractor_id').notNull().references(() => subcontractors.id, { onDelete: 'cascade' }),
  type: text('type', { enum: ['license', 'insurance_coi', 'w9', 'workers_comp', 'safety_plan', 'contract', 'other'] }).notNull(),
  name: text('name').notNull(),
  url: text('url').notNull(),
  expiry_date: text('expiry_date'),
  verified: integer('verified').default(0),
  verified_at: text('verified_at'),
  verified_by: text('verified_by'),
  notes: text('notes'),
  created_at: text('created_at').default(sql`(datetime('now'))`),
});

// =====================================================
// BID PACKAGES (Trade scopes for bidding)
// =====================================================

export const bidPackages = sqliteTable('bid_packages', {
  id: text('id').primaryKey(),
  job_id: text('job_id').notNull().references(() => jobs.id, { onDelete: 'cascade' }),
  user_id: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  package_number: text('package_number'), // e.g., "BP-001"
  name: text('name').notNull(), // e.g., "Electrical"
  csi_division: text('csi_division'), // e.g., "26" for Electrical
  description: text('description'),
  scope_of_work: text('scope_of_work'), // Detailed scope
  inclusions: text('inclusions'), // What's included
  exclusions: text('exclusions'), // What's excluded
  // Schedule
  bid_due_date: text('bid_due_date'),
  work_start_date: text('work_start_date'),
  work_end_date: text('work_end_date'),
  // Budget
  budget_estimate: real('budget_estimate'),
  // Status
  status: text('status', { enum: ['draft', 'open', 'reviewing', 'awarded', 'cancelled'] }).default('draft'),
  awarded_to: text('awarded_to').references(() => subcontractors.id, { onDelete: 'set null' }),
  awarded_amount: real('awarded_amount'),
  awarded_at: text('awarded_at'),
  // Attachments reference (drawings, specs)
  attachments: text('attachments'), // JSON array of URLs
  notes: text('notes'),
  created_at: text('created_at').default(sql`(datetime('now'))`),
  updated_at: text('updated_at').default(sql`(datetime('now'))`),
}, (table) => [
  index('idx_bid_packages_job_id').on(table.job_id),
  index('idx_bid_packages_status').on(table.status),
]);

// =====================================================
// BID PACKAGE INVITES (Subs invited to bid)
// =====================================================

export const bidPackageInvites = sqliteTable('bid_package_invites', {
  id: text('id').primaryKey(),
  bid_package_id: text('bid_package_id').notNull().references(() => bidPackages.id, { onDelete: 'cascade' }),
  subcontractor_id: text('subcontractor_id').notNull().references(() => subcontractors.id, { onDelete: 'cascade' }),
  invited_at: text('invited_at').default(sql`(datetime('now'))`),
  invited_via: text('invited_via', { enum: ['email', 'phone', 'in_person', 'portal'] }).default('email'),
  status: text('status', { enum: ['pending', 'viewed', 'declined', 'submitted'] }).default('pending'),
  viewed_at: text('viewed_at'),
  declined_at: text('declined_at'),
  decline_reason: text('decline_reason'),
  notes: text('notes'),
});

// =====================================================
// SUBCONTRACTOR BIDS
// =====================================================

export const subcontractorBids = sqliteTable('subcontractor_bids', {
  id: text('id').primaryKey(),
  bid_package_id: text('bid_package_id').notNull().references(() => bidPackages.id, { onDelete: 'cascade' }),
  subcontractor_id: text('subcontractor_id').notNull().references(() => subcontractors.id, { onDelete: 'cascade' }),
  // Pricing
  base_bid: real('base_bid').notNull(),
  labor_cost: real('labor_cost'),
  material_cost: real('material_cost'),
  equipment_cost: real('equipment_cost'),
  overhead_profit: real('overhead_profit'),
  // Alternates (add/deduct)
  alternates: text('alternates'), // JSON array of {name, amount, type: 'add'|'deduct'}
  // Clarifications
  assumptions: text('assumptions'),
  clarifications: text('clarifications'),
  exclusions: text('exclusions'),
  // Schedule
  proposed_start: text('proposed_start'),
  proposed_duration: text('proposed_duration'), // e.g., "3 weeks"
  lead_time: text('lead_time'), // e.g., "2 weeks"
  // Compliance status at time of bid
  compliance_verified: integer('compliance_verified').default(0),
  // Evaluation
  status: text('status', { enum: ['submitted', 'under_review', 'selected', 'rejected', 'withdrawn'] }).default('submitted'),
  score: integer('score'), // 1-100 for bid leveling
  evaluator_notes: text('evaluator_notes'),
  // Attachments
  attachments: text('attachments'), // JSON array of URLs
  submitted_at: text('submitted_at').default(sql`(datetime('now'))`),
  reviewed_at: text('reviewed_at'),
}, (table) => [
  index('idx_sub_bids_package').on(table.bid_package_id),
  index('idx_sub_bids_subcontractor').on(table.subcontractor_id),
]);

// =====================================================
// BID RFIs (Questions during bidding)
// =====================================================

export const bidRfis = sqliteTable('bid_rfis', {
  id: text('id').primaryKey(),
  bid_package_id: text('bid_package_id').notNull().references(() => bidPackages.id, { onDelete: 'cascade' }),
  subcontractor_id: text('subcontractor_id').references(() => subcontractors.id, { onDelete: 'set null' }),
  rfi_number: text('rfi_number'), // e.g., "RFI-001"
  question: text('question').notNull(),
  response: text('response'),
  responded_at: text('responded_at'),
  is_public: integer('is_public').default(1), // Share with all bidders?
  attachments: text('attachments'),
  created_at: text('created_at').default(sql`(datetime('now'))`),
});

// =====================================================
// ESTIMATE SECTIONS (Group line items)
// =====================================================

export const estimateSections = sqliteTable('estimate_sections', {
  id: text('id').primaryKey(),
  estimate_id: text('estimate_id').notNull().references(() => estimates.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description'),
  cost_code: text('cost_code'), // Link to CSI division
  sort_order: integer('sort_order').default(0),
  created_at: text('created_at').default(sql`(datetime('now'))`),
});

// =====================================================
// ESTIMATE LINE ITEMS (Enhanced with cost breakdown)
// =====================================================

export const estimateLineItems = sqliteTable('estimate_line_items', {
  id: text('id').primaryKey(),
  estimate_id: text('estimate_id').notNull().references(() => estimates.id, { onDelete: 'cascade' }),
  section_id: text('section_id').references(() => estimateSections.id, { onDelete: 'set null' }),
  cost_code_id: text('cost_code_id').references(() => costCodes.id, { onDelete: 'set null' }),
  bid_package_id: text('bid_package_id').references(() => bidPackages.id, { onDelete: 'set null' }),
  description: text('description').notNull(),
  // Quantities
  quantity: real('quantity').default(1),
  unit: text('unit'), // e.g., "SF", "LF", "EA", "HR"
  // Cost breakdown
  unit_price: real('unit_price').default(0),
  labor_cost: real('labor_cost').default(0),
  labor_hours: real('labor_hours'),
  labor_rate: real('labor_rate'),
  material_cost: real('material_cost').default(0),
  equipment_cost: real('equipment_cost').default(0),
  subcontractor_cost: real('subcontractor_cost').default(0),
  // Calculated
  subtotal: real('subtotal').default(0), // qty * unit_price
  markup_percent: real('markup_percent').default(0),
  markup_amount: real('markup_amount').default(0),
  total: real('total').default(0),
  // Flags
  is_optional: integer('is_optional').default(0),
  is_allowance: integer('is_allowance').default(0),
  is_alternate: integer('is_alternate').default(0),
  alternate_type: text('alternate_type', { enum: ['add', 'deduct'] }),
  // SOV
  include_in_sov: integer('include_in_sov').default(1),
  sov_description: text('sov_description'), // Override for SOV
  // Tracking
  sort_order: integer('sort_order').default(0),
  notes: text('notes'),
  created_at: text('created_at').default(sql`(datetime('now'))`),
}, (table) => [
  index('idx_line_items_estimate').on(table.estimate_id),
  index('idx_line_items_section').on(table.section_id),
]);

// =====================================================
// ESTIMATE ALLOWANCES
// =====================================================

export const estimateAllowances = sqliteTable('estimate_allowances', {
  id: text('id').primaryKey(),
  estimate_id: text('estimate_id').notNull().references(() => estimates.id, { onDelete: 'cascade' }),
  name: text('name').notNull(), // e.g., "Flooring Allowance"
  description: text('description'),
  amount: real('amount').notNull(),
  cost_code_id: text('cost_code_id').references(() => costCodes.id, { onDelete: 'set null' }),
  is_owner_selection: integer('is_owner_selection').default(1),
  status: text('status', { enum: ['pending', 'selected', 'finalized'] }).default('pending'),
  actual_amount: real('actual_amount'),
  variance: real('variance'),
  notes: text('notes'),
  created_at: text('created_at').default(sql`(datetime('now'))`),
});

// =====================================================
// ESTIMATE ALTERNATES (Add/Deduct options)
// =====================================================

export const estimateAlternates = sqliteTable('estimate_alternates', {
  id: text('id').primaryKey(),
  estimate_id: text('estimate_id').notNull().references(() => estimates.id, { onDelete: 'cascade' }),
  alternate_number: text('alternate_number'), // e.g., "ALT-1"
  name: text('name').notNull(),
  description: text('description'),
  type: text('type', { enum: ['add', 'deduct'] }).notNull(),
  amount: real('amount').notNull(),
  cost_code_id: text('cost_code_id').references(() => costCodes.id, { onDelete: 'set null' }),
  status: text('status', { enum: ['proposed', 'accepted', 'rejected'] }).default('proposed'),
  accepted_at: text('accepted_at'),
  notes: text('notes'),
  created_at: text('created_at').default(sql`(datetime('now'))`),
});

// =====================================================
// ESTIMATE CONTINGENCY
// =====================================================

export const estimateContingency = sqliteTable('estimate_contingency', {
  id: text('id').primaryKey(),
  estimate_id: text('estimate_id').notNull().references(() => estimates.id, { onDelete: 'cascade' }),
  name: text('name').default('Contingency'),
  description: text('description'),
  type: text('type', { enum: ['percent', 'fixed'] }).default('percent'),
  percent_value: real('percent_value'), // e.g., 10 for 10%
  fixed_value: real('fixed_value'),
  calculated_amount: real('calculated_amount'),
  applies_to: text('applies_to', { enum: ['all', 'labor', 'materials', 'custom'] }).default('all'),
  notes: text('notes'),
  created_at: text('created_at').default(sql`(datetime('now'))`),
});

// =====================================================
// ESTIMATE OVERHEAD & PROFIT
// =====================================================

export const estimateOverheadProfit = sqliteTable('estimate_overhead_profit', {
  id: text('id').primaryKey(),
  estimate_id: text('estimate_id').notNull().references(() => estimates.id, { onDelete: 'cascade' }),
  overhead_percent: real('overhead_percent').default(0),
  overhead_amount: real('overhead_amount').default(0),
  profit_percent: real('profit_percent').default(0),
  profit_amount: real('profit_amount').default(0),
  total: real('total').default(0),
  notes: text('notes'),
  created_at: text('created_at').default(sql`(datetime('now'))`),
});

// =====================================================
// SCHEDULE OF VALUES (SOV)
// =====================================================

export const scheduleOfValues = sqliteTable('schedule_of_values', {
  id: text('id').primaryKey(),
  job_id: text('job_id').notNull().references(() => jobs.id, { onDelete: 'cascade' }),
  estimate_id: text('estimate_id').references(() => estimates.id, { onDelete: 'set null' }),
  user_id: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').default('Schedule of Values'),
  version: integer('version').default(1),
  status: text('status', { enum: ['draft', 'submitted', 'approved', 'active'] }).default('draft'),
  total_contract_amount: real('total_contract_amount').default(0),
  approved_at: text('approved_at'),
  approved_by: text('approved_by'),
  notes: text('notes'),
  created_at: text('created_at').default(sql`(datetime('now'))`),
  updated_at: text('updated_at').default(sql`(datetime('now'))`),
}, (table) => [
  index('idx_sov_job_id').on(table.job_id),
]);

// =====================================================
// SOV LINE ITEMS
// =====================================================

export const sovLineItems = sqliteTable('sov_line_items', {
  id: text('id').primaryKey(),
  sov_id: text('sov_id').notNull().references(() => scheduleOfValues.id, { onDelete: 'cascade' }),
  line_number: text('line_number'), // e.g., "1", "1.1", "2"
  cost_code_id: text('cost_code_id').references(() => costCodes.id, { onDelete: 'set null' }),
  description: text('description').notNull(),
  // Original values
  scheduled_value: real('scheduled_value').notNull().default(0),
  // Change order adjustments
  approved_changes: real('approved_changes').default(0),
  revised_value: real('revised_value').default(0), // scheduled + approved changes
  // Billing (will be used in Phase 3)
  previous_billed: real('previous_billed').default(0),
  current_billed: real('current_billed').default(0),
  total_billed: real('total_billed').default(0),
  percent_complete: real('percent_complete').default(0),
  balance_to_finish: real('balance_to_finish').default(0),
  // Retainage (will be used in Phase 3)
  retainage_percent: real('retainage_percent').default(10),
  retainage_held: real('retainage_held').default(0),
  // Source tracking
  estimate_line_item_id: text('estimate_line_item_id').references(() => estimateLineItems.id, { onDelete: 'set null' }),
  sort_order: integer('sort_order').default(0),
  notes: text('notes'),
  created_at: text('created_at').default(sql`(datetime('now'))`),
});

// =====================================================
// MULTI-INDUSTRY SUPPORT
// =====================================================

// =====================================================
// INDUSTRY PROFILES (Master Configuration)
// =====================================================

export const industryProfiles = sqliteTable('industry_profiles', {
  id: text('id').primaryKey(), // 'gc', 'property_mgmt', 'trade_contractor', 'developer'
  name: text('name').notNull(), // 'General Contractor'
  description: text('description'),
  icon: text('icon'),
  color: text('color'),
  // Module configuration (JSON)
  enabled_modules: text('enabled_modules'), // ["jobs", "estimates", "sov", "bid_packages"]
  disabled_modules: text('disabled_modules'), // ["work_orders", "tenants"]
  // Field configuration (JSON)
  required_fields: text('required_fields'), // {"jobs": ["client_id"], "estimates": ["po_number"]}
  hidden_fields: text('hidden_fields'), // {"jobs": ["tenant_id", "lease_id"]}
  // Terminology overrides (JSON)
  terminology: text('terminology'), // {"job": "Project", "client": "Customer"}
  // Default settings (JSON)
  default_settings: text('default_settings'), // {"default_retainage": 10, "default_markup": 15}
  sort_order: integer('sort_order').default(0),
  is_active: integer('is_active').default(1),
  created_at: text('created_at').default(sql`(datetime('now'))`),
});

// =====================================================
// USER INDUSTRY SETTINGS
// =====================================================

export const userIndustrySettings = sqliteTable('user_industry_settings', {
  id: text('id').primaryKey(),
  user_id: text('user_id').notNull().unique().references(() => users.id, { onDelete: 'cascade' }),
  industry_id: text('industry_id').notNull().references(() => industryProfiles.id),
  // User overrides (JSON)
  custom_terminology: text('custom_terminology'),
  custom_settings: text('custom_settings'),
  // Onboarding
  onboarding_completed: integer('onboarding_completed').default(0),
  onboarding_step: text('onboarding_step'),
  created_at: text('created_at').default(sql`(datetime('now'))`),
  updated_at: text('updated_at').default(sql`(datetime('now'))`),
}, (table) => [
  index('idx_user_industry_user_id').on(table.user_id),
]);

// =====================================================
// PROPERTY MANAGEMENT TABLES
// =====================================================

// =====================================================
// UNITS (Sub-locations within properties)
// =====================================================

export const units = sqliteTable('units', {
  id: text('id').primaryKey(),
  property_id: text('property_id').notNull().references(() => jobs.id, { onDelete: 'cascade' }), // jobs with industry_type = 'property_mgmt'
  user_id: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  unit_number: text('unit_number').notNull(), // "101", "A", "Suite 500"
  unit_type: text('unit_type'), // 'apartment', 'office', 'retail', 'storage'
  floor: integer('floor'),
  // Size
  square_footage: real('square_footage'),
  bedrooms: integer('bedrooms'),
  bathrooms: real('bathrooms'),
  // Status
  status: text('status', { enum: ['vacant', 'occupied', 'maintenance', 'offline'] }).default('vacant'),
  // Current occupant
  current_tenant_id: text('current_tenant_id'),
  current_lease_id: text('current_lease_id'),
  // Rent
  market_rent: real('market_rent'),
  current_rent: real('current_rent'),
  notes: text('notes'),
  created_at: text('created_at').default(sql`(datetime('now'))`),
  updated_at: text('updated_at').default(sql`(datetime('now'))`),
}, (table) => [
  index('idx_units_property_id').on(table.property_id),
  index('idx_units_user_id').on(table.user_id),
  index('idx_units_status').on(table.status),
]);

// =====================================================
// TENANTS
// =====================================================

export const tenants = sqliteTable('tenants', {
  id: text('id').primaryKey(),
  user_id: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  // Contact info
  first_name: text('first_name').notNull(),
  last_name: text('last_name'),
  company_name: text('company_name'), // For commercial tenants
  email: text('email'),
  phone: text('phone'),
  mobile: text('mobile'),
  // Emergency contact
  emergency_contact_name: text('emergency_contact_name'),
  emergency_contact_phone: text('emergency_contact_phone'),
  // Status
  status: text('status', { enum: ['prospect', 'applicant', 'active', 'past', 'evicted'] }).default('prospect'),
  // Screening
  credit_score: integer('credit_score'),
  background_check_date: text('background_check_date'),
  background_check_status: text('background_check_status'),
  // Preferences
  preferred_contact_method: text('preferred_contact_method'),
  communication_opt_in: integer('communication_opt_in').default(1),
  notes: text('notes'),
  created_at: text('created_at').default(sql`(datetime('now'))`),
  updated_at: text('updated_at').default(sql`(datetime('now'))`),
}, (table) => [
  index('idx_tenants_user_id').on(table.user_id),
  index('idx_tenants_status').on(table.status),
]);

// =====================================================
// LEASES
// =====================================================

export const leases = sqliteTable('leases', {
  id: text('id').primaryKey(),
  user_id: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  property_id: text('property_id').notNull().references(() => jobs.id, { onDelete: 'cascade' }),
  unit_id: text('unit_id').references(() => units.id, { onDelete: 'set null' }),
  tenant_id: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  // Lease terms
  lease_type: text('lease_type', { enum: ['fixed', 'month_to_month', 'week_to_week'] }).default('fixed'),
  start_date: text('start_date').notNull(),
  end_date: text('end_date'),
  // Rent
  monthly_rent: real('monthly_rent').notNull(),
  security_deposit: real('security_deposit'),
  pet_deposit: real('pet_deposit'),
  // Payment
  rent_due_day: integer('rent_due_day').default(1), // Day of month rent is due
  late_fee_amount: real('late_fee_amount'),
  late_fee_grace_days: integer('late_fee_grace_days').default(5),
  // Status
  status: text('status', { enum: ['draft', 'pending', 'active', 'expired', 'terminated'] }).default('draft'),
  // Move in/out
  move_in_date: text('move_in_date'),
  move_out_date: text('move_out_date'),
  move_in_inspection_id: text('move_in_inspection_id'),
  move_out_inspection_id: text('move_out_inspection_id'),
  // Documents
  lease_document_url: text('lease_document_url'),
  notes: text('notes'),
  created_at: text('created_at').default(sql`(datetime('now'))`),
  updated_at: text('updated_at').default(sql`(datetime('now'))`),
}, (table) => [
  index('idx_leases_user_id').on(table.user_id),
  index('idx_leases_property_id').on(table.property_id),
  index('idx_leases_tenant_id').on(table.tenant_id),
  index('idx_leases_status').on(table.status),
]);

// =====================================================
// WORK ORDERS (Service Requests for PM)
// =====================================================

export const workOrders = sqliteTable('work_orders', {
  id: text('id').primaryKey(),
  user_id: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  property_id: text('property_id').notNull().references(() => jobs.id, { onDelete: 'cascade' }),
  unit_id: text('unit_id').references(() => units.id, { onDelete: 'set null' }),
  tenant_id: text('tenant_id').references(() => tenants.id, { onDelete: 'set null' }), // Who reported it
  // Request details
  work_order_number: text('work_order_number'),
  title: text('title').notNull(),
  description: text('description'),
  category: text('category'), // 'plumbing', 'electrical', 'hvac', 'appliance', 'general'
  // Priority & SLA
  priority: text('priority', { enum: ['emergency', 'urgent', 'normal', 'low'] }).default('normal'),
  sla_response_hours: integer('sla_response_hours'),
  sla_completion_hours: integer('sla_completion_hours'),
  // Status workflow
  status: text('status', { enum: ['new', 'triaged', 'assigned', 'in_progress', 'pending_parts', 'completed', 'cancelled'] }).default('new'),
  // Assignment
  assigned_vendor_id: text('assigned_vendor_id').references(() => subcontractors.id, { onDelete: 'set null' }),
  assigned_at: text('assigned_at'),
  // Scheduling
  scheduled_date: text('scheduled_date'),
  scheduled_time_start: text('scheduled_time_start'),
  scheduled_time_end: text('scheduled_time_end'),
  // Access
  access_instructions: text('access_instructions'),
  permission_to_enter: integer('permission_to_enter').default(0),
  // Completion
  completed_at: text('completed_at'),
  completed_by: text('completed_by'),
  resolution_notes: text('resolution_notes'),
  // Cost
  not_to_exceed: real('not_to_exceed'), // NTE amount
  actual_cost: real('actual_cost'),
  labor_cost: real('labor_cost'),
  parts_cost: real('parts_cost'),
  // Billing
  billable_to: text('billable_to'), // 'owner', 'tenant', 'property'
  invoice_id: text('invoice_id'),
  // Asset tracking
  asset_id: text('asset_id'),
  // Photos (JSON array)
  photos: text('photos'),
  // Tenant satisfaction
  tenant_rating: integer('tenant_rating'),
  tenant_feedback: text('tenant_feedback'),
  reported_at: text('reported_at').default(sql`(datetime('now'))`),
  created_at: text('created_at').default(sql`(datetime('now'))`),
  updated_at: text('updated_at').default(sql`(datetime('now'))`),
}, (table) => [
  index('idx_work_orders_user_id').on(table.user_id),
  index('idx_work_orders_property_id').on(table.property_id),
  index('idx_work_orders_status').on(table.status),
  index('idx_work_orders_priority').on(table.priority),
  index('idx_work_orders_assigned_vendor').on(table.assigned_vendor_id),
]);

// =====================================================
// VENDOR RATE CARDS (Extends subcontractors for PM)
// =====================================================

export const vendorRateCards = sqliteTable('vendor_rate_cards', {
  id: text('id').primaryKey(),
  vendor_id: text('vendor_id').notNull().references(() => subcontractors.id, { onDelete: 'cascade' }),
  user_id: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  // Service
  service_name: text('service_name').notNull(), // "HVAC Service Call", "Plumbing Repair"
  service_category: text('service_category'),
  // Pricing
  rate_type: text('rate_type', { enum: ['flat', 'hourly', 'per_unit'] }).default('flat'),
  flat_rate: real('flat_rate'),
  hourly_rate: real('hourly_rate'),
  minimum_charge: real('minimum_charge'),
  // After hours
  after_hours_rate: real('after_hours_rate'),
  emergency_rate: real('emergency_rate'),
  // Valid dates
  effective_date: text('effective_date'),
  expiration_date: text('expiration_date'),
  is_active: integer('is_active').default(1),
  notes: text('notes'),
  created_at: text('created_at').default(sql`(datetime('now'))`),
}, (table) => [
  index('idx_vendor_rate_cards_vendor_id').on(table.vendor_id),
  index('idx_vendor_rate_cards_user_id').on(table.user_id),
]);

// =====================================================
// ASSETS (Trackable equipment at properties)
// =====================================================

export const assets = sqliteTable('assets', {
  id: text('id').primaryKey(),
  user_id: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  property_id: text('property_id').references(() => jobs.id, { onDelete: 'set null' }),
  unit_id: text('unit_id').references(() => units.id, { onDelete: 'set null' }),
  // Identification
  name: text('name').notNull(), // "HVAC Unit", "Water Heater", "Refrigerator"
  asset_tag: text('asset_tag'),
  serial_number: text('serial_number'),
  // Classification
  category: text('category'), // 'hvac', 'plumbing', 'electrical', 'appliance', 'structural'
  subcategory: text('subcategory'),
  // Details
  brand: text('brand'),
  model: text('model'),
  year_installed: integer('year_installed'),
  // Location
  location_description: text('location_description'), // "Unit 101 Kitchen", "Rooftop"
  // Status
  status: text('status', { enum: ['active', 'needs_repair', 'out_of_service', 'replaced'] }).default('active'),
  condition: text('condition', { enum: ['excellent', 'good', 'fair', 'poor'] }).default('good'),
  // Lifecycle
  purchase_date: text('purchase_date'),
  purchase_cost: real('purchase_cost'),
  warranty_expiry: text('warranty_expiry'),
  expected_lifespan_years: integer('expected_lifespan_years'),
  replacement_cost: real('replacement_cost'),
  // Maintenance
  last_service_date: text('last_service_date'),
  next_service_date: text('next_service_date'),
  maintenance_schedule_id: text('maintenance_schedule_id'),
  // Documents (JSON)
  documents: text('documents'), // Manuals, warranties
  notes: text('notes'),
  created_at: text('created_at').default(sql`(datetime('now'))`),
  updated_at: text('updated_at').default(sql`(datetime('now'))`),
}, (table) => [
  index('idx_assets_user_id').on(table.user_id),
  index('idx_assets_property_id').on(table.property_id),
  index('idx_assets_status').on(table.status),
  index('idx_assets_category').on(table.category),
]);

// =====================================================
// ASSET HISTORY
// =====================================================

export const assetHistory = sqliteTable('asset_history', {
  id: text('id').primaryKey(),
  asset_id: text('asset_id').notNull().references(() => assets.id, { onDelete: 'cascade' }),
  user_id: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  // Event
  event_type: text('event_type').notNull(), // 'installed', 'serviced', 'repaired', 'replaced', 'inspection', 'note'
  event_date: text('event_date').notNull(),
  // Details
  description: text('description'),
  performed_by: text('performed_by'), // Vendor name or internal
  vendor_id: text('vendor_id').references(() => subcontractors.id, { onDelete: 'set null' }),
  work_order_id: text('work_order_id').references(() => workOrders.id, { onDelete: 'set null' }),
  // Cost
  cost: real('cost'),
  // Condition change
  condition_before: text('condition_before'),
  condition_after: text('condition_after'),
  // Documents (JSON)
  documents: text('documents'),
  notes: text('notes'),
  created_at: text('created_at').default(sql`(datetime('now'))`),
}, (table) => [
  index('idx_asset_history_asset_id').on(table.asset_id),
  index('idx_asset_history_event_date').on(table.event_date),
]);

// =====================================================
// MAINTENANCE SCHEDULES (Preventative maintenance)
// =====================================================

export const maintenanceSchedules = sqliteTable('maintenance_schedules', {
  id: text('id').primaryKey(),
  user_id: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  // Scope
  property_id: text('property_id').references(() => jobs.id, { onDelete: 'cascade' }), // NULL = all properties
  unit_id: text('unit_id').references(() => units.id, { onDelete: 'set null' }),
  asset_id: text('asset_id').references(() => assets.id, { onDelete: 'set null' }),
  // Schedule
  name: text('name').notNull(), // "Quarterly HVAC Filter Change"
  description: text('description'),
  category: text('category'),
  // Frequency
  frequency_type: text('frequency_type').notNull(), // 'daily', 'weekly', 'monthly', 'quarterly', 'semi_annual', 'annual', 'custom'
  frequency_interval: integer('frequency_interval'), // For custom: every N days
  // Timing
  start_date: text('start_date').notNull(),
  end_date: text('end_date'), // NULL = no end
  last_completed: text('last_completed'),
  next_due: text('next_due'),
  // Assignment
  default_vendor_id: text('default_vendor_id').references(() => subcontractors.id, { onDelete: 'set null' }),
  estimated_cost: real('estimated_cost'),
  // Status
  is_active: integer('is_active').default(1),
  notes: text('notes'),
  created_at: text('created_at').default(sql`(datetime('now'))`),
  updated_at: text('updated_at').default(sql`(datetime('now'))`),
}, (table) => [
  index('idx_maintenance_schedules_user_id').on(table.user_id),
  index('idx_maintenance_schedules_property_id').on(table.property_id),
  index('idx_maintenance_schedules_next_due').on(table.next_due),
]);

// =====================================================
// RENT CHARGES (Rent and recurring charges)
// =====================================================

export const rentCharges = sqliteTable('rent_charges', {
  id: text('id').primaryKey(),
  user_id: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  lease_id: text('lease_id').notNull().references(() => leases.id, { onDelete: 'cascade' }),
  // Charge details
  charge_type: text('charge_type').notNull(), // 'rent', 'late_fee', 'utility', 'pet', 'parking', 'other'
  description: text('description'),
  amount: real('amount').notNull(),
  // Period
  charge_date: text('charge_date').notNull(),
  due_date: text('due_date').notNull(),
  period_start: text('period_start'),
  period_end: text('period_end'),
  // Status
  status: text('status', { enum: ['pending', 'paid', 'partial', 'late', 'waived', 'void'] }).default('pending'),
  // Payment
  amount_paid: real('amount_paid').default(0),
  paid_date: text('paid_date'),
  payment_method: text('payment_method'),
  notes: text('notes'),
  created_at: text('created_at').default(sql`(datetime('now'))`),
}, (table) => [
  index('idx_rent_charges_user_id').on(table.user_id),
  index('idx_rent_charges_lease_id').on(table.lease_id),
  index('idx_rent_charges_status').on(table.status),
  index('idx_rent_charges_due_date').on(table.due_date),
]);
