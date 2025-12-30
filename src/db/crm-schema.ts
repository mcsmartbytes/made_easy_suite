import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';
import { relations } from 'drizzle-orm';

// Users table for authentication
export const users = sqliteTable('users', {
  id: text('id').primaryKey(), // UUID
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  fullName: text('full_name'),
  companyName: text('company_name'),
  createdAt: text('created_at').default('CURRENT_TIMESTAMP'),
  updatedAt: text('updated_at').default('CURRENT_TIMESTAMP'),
});

// Companies/Organizations
export const companies = sqliteTable('companies', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: text('user_id').references(() => users.id), // Multi-tenancy
  name: text('name').notNull(),
  industry: text('industry'),
  website: text('website'),
  phone: text('phone'),
  email: text('email'),
  address: text('address'),
  city: text('city'),
  state: text('state'),
  zip: text('zip'),
  notes: text('notes'),
  createdAt: text('created_at').default('CURRENT_TIMESTAMP'),
  updatedAt: text('updated_at').default('CURRENT_TIMESTAMP'),
});

// Contacts (Leads & Customers)
export const contacts = sqliteTable('contacts', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: text('user_id').references(() => users.id), // Multi-tenancy
  companyId: integer('company_id').references(() => companies.id),
  firstName: text('first_name').notNull(),
  lastName: text('last_name').notNull(),
  email: text('email'),
  phone: text('phone'),
  mobile: text('mobile'),
  jobTitle: text('job_title'),
  status: text('status').default('lead'), // lead, prospect, customer, inactive
  source: text('source'), // website, referral, cold_call, advertisement, etc.
  address: text('address'),
  city: text('city'),
  state: text('state'),
  zip: text('zip'),
  notes: text('notes'),
  lastContactedAt: text('last_contacted_at'),
  createdAt: text('created_at').default('CURRENT_TIMESTAMP'),
  updatedAt: text('updated_at').default('CURRENT_TIMESTAMP'),
});

// Deals/Opportunities (Sales Pipeline)
export const deals = sqliteTable('deals', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: text('user_id').references(() => users.id), // Multi-tenancy
  contactId: integer('contact_id').references(() => contacts.id),
  companyId: integer('company_id').references(() => companies.id),
  title: text('title').notNull(),
  value: real('value').default(0),
  stage: text('stage').default('lead'), // lead, qualified, proposal, negotiation, won, lost
  probability: integer('probability').default(0), // 0-100%
  expectedCloseDate: text('expected_close_date'),
  actualCloseDate: text('actual_close_date'),
  description: text('description'),
  lostReason: text('lost_reason'),
  createdAt: text('created_at').default('CURRENT_TIMESTAMP'),
  updatedAt: text('updated_at').default('CURRENT_TIMESTAMP'),
});

// Activities (Calls, Emails, Meetings, Notes)
export const activities = sqliteTable('activities', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: text('user_id').references(() => users.id), // Multi-tenancy
  contactId: integer('contact_id').references(() => contacts.id),
  companyId: integer('company_id').references(() => companies.id),
  dealId: integer('deal_id').references(() => deals.id),
  type: text('type').notNull(), // call, email, meeting, note, task
  subject: text('subject').notNull(),
  description: text('description'),
  outcome: text('outcome'), // completed, no_answer, left_message, scheduled, etc.
  dueDate: text('due_date'),
  completedAt: text('completed_at'),
  duration: integer('duration'), // in minutes
  createdAt: text('created_at').default('CURRENT_TIMESTAMP'),
});

// Tasks
export const tasks = sqliteTable('tasks', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: text('user_id').references(() => users.id), // Multi-tenancy
  contactId: integer('contact_id').references(() => contacts.id),
  companyId: integer('company_id').references(() => companies.id),
  dealId: integer('deal_id').references(() => deals.id),
  title: text('title').notNull(),
  description: text('description'),
  priority: text('priority').default('medium'), // low, medium, high, urgent
  status: text('status').default('pending'), // pending, in_progress, completed, cancelled
  dueDate: text('due_date'),
  completedAt: text('completed_at'),
  createdAt: text('created_at').default('CURRENT_TIMESTAMP'),
});

// Tags for flexible categorization
export const tags = sqliteTable('tags', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: text('user_id').references(() => users.id), // Multi-tenancy
  name: text('name').notNull(),
  color: text('color').default('#3B82F6'), // hex color
  createdAt: text('created_at').default('CURRENT_TIMESTAMP'),
});

// Contact-Tag junction table
export const contactTags = sqliteTable('contact_tags', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  contactId: integer('contact_id').references(() => contacts.id).notNull(),
  tagId: integer('tag_id').references(() => tags.id).notNull(),
});

// Pipeline Stages (customizable)
export const pipelineStages = sqliteTable('pipeline_stages', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: text('user_id').references(() => users.id), // Multi-tenancy
  name: text('name').notNull(),
  order: integer('order').notNull(),
  color: text('color').default('#3B82F6'),
  probability: integer('probability').default(0),
  createdAt: text('created_at').default('CURRENT_TIMESTAMP'),
});

// Relations
export const companiesRelations = relations(companies, ({ many }) => ({
  contacts: many(contacts),
  deals: many(deals),
  activities: many(activities),
}));

export const contactsRelations = relations(contacts, ({ one, many }) => ({
  company: one(companies, {
    fields: [contacts.companyId],
    references: [companies.id],
  }),
  deals: many(deals),
  activities: many(activities),
  tasks: many(tasks),
  contactTags: many(contactTags),
}));

export const dealsRelations = relations(deals, ({ one, many }) => ({
  contact: one(contacts, {
    fields: [deals.contactId],
    references: [contacts.id],
  }),
  company: one(companies, {
    fields: [deals.companyId],
    references: [companies.id],
  }),
  activities: many(activities),
  tasks: many(tasks),
}));

export const activitiesRelations = relations(activities, ({ one }) => ({
  contact: one(contacts, {
    fields: [activities.contactId],
    references: [contacts.id],
  }),
  company: one(companies, {
    fields: [activities.companyId],
    references: [companies.id],
  }),
  deal: one(deals, {
    fields: [activities.dealId],
    references: [deals.id],
  }),
}));

export const tasksRelations = relations(tasks, ({ one }) => ({
  contact: one(contacts, {
    fields: [tasks.contactId],
    references: [contacts.id],
  }),
  company: one(companies, {
    fields: [tasks.companyId],
    references: [companies.id],
  }),
  deal: one(deals, {
    fields: [tasks.dealId],
    references: [deals.id],
  }),
}));

export const contactTagsRelations = relations(contactTags, ({ one }) => ({
  contact: one(contacts, {
    fields: [contactTags.contactId],
    references: [contacts.id],
  }),
  tag: one(tags, {
    fields: [contactTags.tagId],
    references: [tags.id],
  }),
}));
