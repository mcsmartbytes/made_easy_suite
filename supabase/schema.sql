-- Made Easy Suite Database Schema
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- DROP EXISTING POLICIES (if they exist)
-- =====================================================
DO $$
BEGIN
  -- Jobs policies
  DROP POLICY IF EXISTS "Users can view own jobs" ON jobs;
  DROP POLICY IF EXISTS "Users can insert own jobs" ON jobs;
  DROP POLICY IF EXISTS "Users can update own jobs" ON jobs;
  DROP POLICY IF EXISTS "Users can delete own jobs" ON jobs;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$
BEGIN
  DROP POLICY IF EXISTS "Users can view own estimates" ON estimates;
  DROP POLICY IF EXISTS "Users can insert own estimates" ON estimates;
  DROP POLICY IF EXISTS "Users can update own estimates" ON estimates;
  DROP POLICY IF EXISTS "Users can delete own estimates" ON estimates;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$
BEGIN
  DROP POLICY IF EXISTS "Users can view own estimate items" ON estimate_items;
  DROP POLICY IF EXISTS "Users can insert own estimate items" ON estimate_items;
  DROP POLICY IF EXISTS "Users can update own estimate items" ON estimate_items;
  DROP POLICY IF EXISTS "Users can delete own estimate items" ON estimate_items;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$
BEGIN
  DROP POLICY IF EXISTS "Users can view own categories" ON categories;
  DROP POLICY IF EXISTS "Users can insert own categories" ON categories;
  DROP POLICY IF EXISTS "Users can update own categories" ON categories;
  DROP POLICY IF EXISTS "Users can delete own categories" ON categories;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$
BEGIN
  DROP POLICY IF EXISTS "Users can view own expenses" ON expenses;
  DROP POLICY IF EXISTS "Users can insert own expenses" ON expenses;
  DROP POLICY IF EXISTS "Users can update own expenses" ON expenses;
  DROP POLICY IF EXISTS "Users can delete own expenses" ON expenses;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$
BEGIN
  DROP POLICY IF EXISTS "Users can view own invoices" ON invoices;
  DROP POLICY IF EXISTS "Users can insert own invoices" ON invoices;
  DROP POLICY IF EXISTS "Users can update own invoices" ON invoices;
  DROP POLICY IF EXISTS "Users can delete own invoices" ON invoices;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$
BEGIN
  DROP POLICY IF EXISTS "Users can view own invoice items" ON invoice_items;
  DROP POLICY IF EXISTS "Users can insert own invoice items" ON invoice_items;
  DROP POLICY IF EXISTS "Users can update own invoice items" ON invoice_items;
  DROP POLICY IF EXISTS "Users can delete own invoice items" ON invoice_items;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$
BEGIN
  DROP POLICY IF EXISTS "Users can view own contacts" ON contacts;
  DROP POLICY IF EXISTS "Users can insert own contacts" ON contacts;
  DROP POLICY IF EXISTS "Users can update own contacts" ON contacts;
  DROP POLICY IF EXISTS "Users can delete own contacts" ON contacts;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$
BEGIN
  DROP POLICY IF EXISTS "Users can view own time entries" ON time_entries;
  DROP POLICY IF EXISTS "Users can insert own time entries" ON time_entries;
  DROP POLICY IF EXISTS "Users can update own time entries" ON time_entries;
  DROP POLICY IF EXISTS "Users can delete own time entries" ON time_entries;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$
BEGIN
  DROP POLICY IF EXISTS "Users can view own mileage" ON mileage;
  DROP POLICY IF EXISTS "Users can insert own mileage" ON mileage;
  DROP POLICY IF EXISTS "Users can update own mileage" ON mileage;
  DROP POLICY IF EXISTS "Users can delete own mileage" ON mileage;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- =====================================================
-- DROP EXISTING TABLES (careful - this deletes data!)
-- Comment out if you want to preserve existing data
-- =====================================================
DROP TABLE IF EXISTS mileage CASCADE;
DROP TABLE IF EXISTS time_entries CASCADE;
DROP TABLE IF EXISTS invoice_items CASCADE;
DROP TABLE IF EXISTS invoices CASCADE;
DROP TABLE IF EXISTS expenses CASCADE;
DROP TABLE IF EXISTS estimate_items CASCADE;
DROP TABLE IF EXISTS estimates CASCADE;
DROP TABLE IF EXISTS contacts CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS jobs CASCADE;

-- =====================================================
-- JOBS
-- =====================================================
CREATE TABLE jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  client_name TEXT,
  client_id UUID,
  status TEXT DEFAULT 'planned' CHECK (status IN ('planned', 'active', 'completed', 'cancelled')),
  property_address TEXT,
  city TEXT,
  state TEXT,
  zip TEXT,
  start_date DATE,
  end_date DATE,
  estimated_revenue DECIMAL(12,2) DEFAULT 0,
  estimated_cost DECIMAL(12,2) DEFAULT 0,
  actual_revenue DECIMAL(12,2) DEFAULT 0,
  actual_cost DECIMAL(12,2) DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_jobs_user_id ON jobs(user_id);
CREATE INDEX idx_jobs_status ON jobs(status);

-- =====================================================
-- ESTIMATES / QUOTES
-- =====================================================
CREATE TABLE estimates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
  client_name TEXT,
  client_email TEXT,
  client_phone TEXT,
  client_address TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'accepted', 'declined', 'expired')),
  subtotal DECIMAL(12,2) DEFAULT 0,
  tax_rate DECIMAL(5,2) DEFAULT 0,
  tax_amount DECIMAL(12,2) DEFAULT 0,
  total DECIMAL(12,2) DEFAULT 0,
  valid_until DATE,
  notes TEXT,
  terms TEXT,
  sent_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_estimates_user_id ON estimates(user_id);
CREATE INDEX idx_estimates_status ON estimates(status);

-- =====================================================
-- ESTIMATE LINE ITEMS
-- =====================================================
CREATE TABLE estimate_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  estimate_id UUID NOT NULL REFERENCES estimates(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantity DECIMAL(12,2) DEFAULT 1,
  unit TEXT,
  unit_price DECIMAL(12,2) DEFAULT 0,
  total DECIMAL(12,2) DEFAULT 0,
  is_optional BOOLEAN DEFAULT FALSE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_estimate_items_estimate ON estimate_items(estimate_id);

-- =====================================================
-- CATEGORIES
-- =====================================================
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  icon TEXT,
  color TEXT,
  deduction_percentage INTEGER DEFAULT 100,
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_categories_user_id ON categories(user_id);

-- =====================================================
-- EXPENSES
-- =====================================================
CREATE TABLE expenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  date DATE NOT NULL,
  vendor TEXT,
  payment_method TEXT,
  is_business BOOLEAN DEFAULT TRUE,
  receipt_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_expenses_user_id ON expenses(user_id);
CREATE INDEX idx_expenses_job_id ON expenses(job_id);
CREATE INDEX idx_expenses_date ON expenses(date);

-- =====================================================
-- INVOICES
-- =====================================================
CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
  client_name TEXT,
  client_email TEXT,
  invoice_number TEXT NOT NULL,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid', 'overdue', 'cancelled')),
  subtotal DECIMAL(12,2) DEFAULT 0,
  tax_rate DECIMAL(5,2) DEFAULT 0,
  tax_amount DECIMAL(12,2) DEFAULT 0,
  total DECIMAL(12,2) DEFAULT 0,
  due_date DATE,
  sent_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_invoices_user_id ON invoices(user_id);
CREATE INDEX idx_invoices_status ON invoices(status);

-- =====================================================
-- INVOICE LINE ITEMS
-- =====================================================
CREATE TABLE invoice_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantity DECIMAL(12,2) DEFAULT 1,
  unit_price DECIMAL(12,2) DEFAULT 0,
  total DECIMAL(12,2) DEFAULT 0,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_invoice_items_invoice ON invoice_items(invoice_id);

-- =====================================================
-- CONTACTS / LEADS / CRM
-- =====================================================
CREATE TABLE contacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT,
  company TEXT,
  email TEXT,
  phone TEXT,
  mobile TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  zip TEXT,
  type TEXT DEFAULT 'lead' CHECK (type IN ('lead', 'prospect', 'customer', 'vendor', 'partner', 'other')),
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'qualified', 'proposal', 'negotiation', 'won', 'lost')),
  source TEXT,
  deal_value DECIMAL(12,2),
  notes TEXT,
  last_contacted TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_contacts_user_id ON contacts(user_id);
CREATE INDEX idx_contacts_type ON contacts(type);
CREATE INDEX idx_contacts_status ON contacts(status);

-- =====================================================
-- TIME ENTRIES
-- =====================================================
CREATE TABLE time_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
  entry_date DATE NOT NULL,
  hours DECIMAL(5,2) NOT NULL,
  hourly_rate DECIMAL(10,2),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_time_entries_user_id ON time_entries(user_id);
CREATE INDEX idx_time_entries_job_id ON time_entries(job_id);

-- =====================================================
-- MILEAGE
-- =====================================================
CREATE TABLE mileage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
  date DATE NOT NULL,
  start_location TEXT,
  end_location TEXT,
  distance DECIMAL(10,2) NOT NULL,
  purpose TEXT,
  rate_per_mile DECIMAL(5,2) DEFAULT 0.67,
  total_amount DECIMAL(10,2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_mileage_user_id ON mileage(user_id);

-- =====================================================
-- ENABLE ROW LEVEL SECURITY
-- =====================================================
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE estimates ENABLE ROW LEVEL SECURITY;
ALTER TABLE estimate_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE mileage ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- RLS POLICIES
-- =====================================================

-- Jobs policies
CREATE POLICY "Users can view own jobs" ON jobs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own jobs" ON jobs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own jobs" ON jobs FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own jobs" ON jobs FOR DELETE USING (auth.uid() = user_id);

-- Estimates policies
CREATE POLICY "Users can view own estimates" ON estimates FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own estimates" ON estimates FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own estimates" ON estimates FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own estimates" ON estimates FOR DELETE USING (auth.uid() = user_id);

-- Estimate items policies
CREATE POLICY "Users can view own estimate items" ON estimate_items FOR SELECT
  USING (EXISTS (SELECT 1 FROM estimates WHERE estimates.id = estimate_items.estimate_id AND estimates.user_id = auth.uid()));
CREATE POLICY "Users can insert own estimate items" ON estimate_items FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM estimates WHERE estimates.id = estimate_items.estimate_id AND estimates.user_id = auth.uid()));
CREATE POLICY "Users can update own estimate items" ON estimate_items FOR UPDATE
  USING (EXISTS (SELECT 1 FROM estimates WHERE estimates.id = estimate_items.estimate_id AND estimates.user_id = auth.uid()));
CREATE POLICY "Users can delete own estimate items" ON estimate_items FOR DELETE
  USING (EXISTS (SELECT 1 FROM estimates WHERE estimates.id = estimate_items.estimate_id AND estimates.user_id = auth.uid()));

-- Categories policies (allow viewing default categories)
CREATE POLICY "Users can view own categories" ON categories FOR SELECT USING (auth.uid() = user_id OR is_default = TRUE);
CREATE POLICY "Users can insert own categories" ON categories FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own categories" ON categories FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own categories" ON categories FOR DELETE USING (auth.uid() = user_id);

-- Expenses policies
CREATE POLICY "Users can view own expenses" ON expenses FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own expenses" ON expenses FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own expenses" ON expenses FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own expenses" ON expenses FOR DELETE USING (auth.uid() = user_id);

-- Invoices policies
CREATE POLICY "Users can view own invoices" ON invoices FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own invoices" ON invoices FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own invoices" ON invoices FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own invoices" ON invoices FOR DELETE USING (auth.uid() = user_id);

-- Invoice items policies
CREATE POLICY "Users can view own invoice items" ON invoice_items FOR SELECT
  USING (EXISTS (SELECT 1 FROM invoices WHERE invoices.id = invoice_items.invoice_id AND invoices.user_id = auth.uid()));
CREATE POLICY "Users can insert own invoice items" ON invoice_items FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM invoices WHERE invoices.id = invoice_items.invoice_id AND invoices.user_id = auth.uid()));
CREATE POLICY "Users can update own invoice items" ON invoice_items FOR UPDATE
  USING (EXISTS (SELECT 1 FROM invoices WHERE invoices.id = invoice_items.invoice_id AND invoices.user_id = auth.uid()));
CREATE POLICY "Users can delete own invoice items" ON invoice_items FOR DELETE
  USING (EXISTS (SELECT 1 FROM invoices WHERE invoices.id = invoice_items.invoice_id AND invoices.user_id = auth.uid()));

-- Contacts policies
CREATE POLICY "Users can view own contacts" ON contacts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own contacts" ON contacts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own contacts" ON contacts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own contacts" ON contacts FOR DELETE USING (auth.uid() = user_id);

-- Time entries policies
CREATE POLICY "Users can view own time entries" ON time_entries FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own time entries" ON time_entries FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own time entries" ON time_entries FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own time entries" ON time_entries FOR DELETE USING (auth.uid() = user_id);

-- Mileage policies
CREATE POLICY "Users can view own mileage" ON mileage FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own mileage" ON mileage FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own mileage" ON mileage FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own mileage" ON mileage FOR DELETE USING (auth.uid() = user_id);

-- =====================================================
-- UPDATED_AT TRIGGER
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_jobs_updated_at ON jobs;
DROP TRIGGER IF EXISTS update_estimates_updated_at ON estimates;
DROP TRIGGER IF EXISTS update_contacts_updated_at ON contacts;

CREATE TRIGGER update_jobs_updated_at BEFORE UPDATE ON jobs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_estimates_updated_at BEFORE UPDATE ON estimates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_contacts_updated_at BEFORE UPDATE ON contacts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- SEED DEFAULT CATEGORIES (user_id NULL = system default)
-- =====================================================
INSERT INTO categories (user_id, name, icon, color, deduction_percentage, is_default) VALUES
  (NULL, 'Materials', 'Package', 'blue', 100, TRUE),
  (NULL, 'Labor', 'Users', 'green', 100, TRUE),
  (NULL, 'Equipment', 'Wrench', 'purple', 100, TRUE),
  (NULL, 'Fuel', 'Fuel', 'orange', 100, TRUE),
  (NULL, 'Subcontractor', 'HardHat', 'yellow', 100, TRUE),
  (NULL, 'Office Supplies', 'Paperclip', 'gray', 100, TRUE),
  (NULL, 'Meals', 'Utensils', 'red', 50, TRUE),
  (NULL, 'Travel', 'Car', 'teal', 100, TRUE),
  (NULL, 'Insurance', 'Shield', 'indigo', 100, TRUE),
  (NULL, 'Advertising', 'Megaphone', 'pink', 100, TRUE);
