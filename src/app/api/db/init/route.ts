import { NextResponse } from 'next/server';
import { getTurso } from '@/lib/turso';

// POST - Initialize database schema
export async function POST() {
  try {
    const client = getTurso();

    // Run schema creation statements
    const statements = [
      // Users (with password auth)
      `CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        full_name TEXT,
        company_name TEXT,
        industry_id TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      )`,

      // Industries
      `CREATE TABLE IF NOT EXISTS industries (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        description TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      )`,

      // Clients
      `CREATE TABLE IF NOT EXISTS clients (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        name TEXT NOT NULL,
        email TEXT,
        phone TEXT,
        address TEXT,
        city TEXT,
        state TEXT,
        zip TEXT,
        notes TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      )`,

      // Jobs
      `CREATE TABLE IF NOT EXISTS jobs (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        name TEXT NOT NULL,
        client_id TEXT,
        client_name TEXT,
        industry_id TEXT,
        status TEXT DEFAULT 'active',
        property_address TEXT,
        city TEXT,
        state TEXT,
        zip TEXT,
        structure_type TEXT,
        roof_type TEXT,
        roof_pitch TEXT,
        layers INTEGER,
        measured_squares REAL,
        dumpster_size TEXT,
        dumpster_hauler TEXT,
        start_date TEXT,
        end_date TEXT,
        notes TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      )`,

      // Tool Categories
      `CREATE TABLE IF NOT EXISTS tool_categories (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        icon TEXT,
        color TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      )`,

      // Tools
      `CREATE TABLE IF NOT EXISTS tools (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        category_id TEXT,
        brand TEXT,
        model TEXT,
        serial_number TEXT,
        qr_code TEXT UNIQUE,
        asset_tag TEXT,
        purchase_date TEXT,
        purchase_price REAL,
        current_value REAL,
        warranty_expires TEXT,
        status TEXT DEFAULT 'available',
        condition TEXT DEFAULT 'good',
        home_location TEXT,
        current_location TEXT,
        assigned_to_user TEXT,
        assigned_to_job TEXT,
        assigned_at TEXT,
        image_url TEXT,
        notes TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      )`,

      // Tool Checkouts
      `CREATE TABLE IF NOT EXISTS tool_checkouts (
        id TEXT PRIMARY KEY,
        tool_id TEXT NOT NULL,
        user_id TEXT,
        checked_out_at TEXT NOT NULL DEFAULT (datetime('now')),
        checked_out_to TEXT,
        checked_out_to_job_id TEXT,
        checkout_notes TEXT,
        checkout_condition TEXT,
        checkout_location TEXT,
        expected_return_date TEXT,
        reminder_date TEXT,
        reminder_sent INTEGER DEFAULT 0,
        checked_in_at TEXT,
        checkin_notes TEXT,
        checkin_condition TEXT,
        checkin_location TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      )`,

      // Tool Maintenance
      `CREATE TABLE IF NOT EXISTS tool_maintenance (
        id TEXT PRIMARY KEY,
        tool_id TEXT NOT NULL,
        user_id TEXT,
        maintenance_type TEXT NOT NULL,
        description TEXT NOT NULL,
        performed_by TEXT,
        performed_at TEXT NOT NULL DEFAULT (date('now')),
        cost REAL,
        vendor TEXT,
        status TEXT DEFAULT 'completed',
        next_maintenance_date TEXT,
        receipt_url TEXT,
        notes TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      )`,

      // Crew Members
      `CREATE TABLE IF NOT EXISTS crew_members (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        name TEXT NOT NULL,
        phone TEXT,
        email TEXT,
        role TEXT,
        is_active INTEGER DEFAULT 1,
        created_at TEXT DEFAULT (datetime('now'))
      )`,

      // Todos / Tasks with reminders
      `CREATE TABLE IF NOT EXISTS todos (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        status TEXT DEFAULT 'pending',
        priority TEXT DEFAULT 'medium',
        due_date TEXT,
        due_time TEXT,
        reminder_date TEXT,
        reminder_time TEXT,
        job_id TEXT,
        completed_at TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      )`,

      // Contacts for CRM
      `CREATE TABLE IF NOT EXISTS contacts (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
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
        type TEXT DEFAULT 'lead',
        source TEXT,
        tags TEXT,
        notes TEXT,
        last_contacted TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      )`,

      // Crew Members (subcontractors, employees, crews)
      `CREATE TABLE IF NOT EXISTS crew_members (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        name TEXT NOT NULL,
        role TEXT,
        type TEXT DEFAULT 'employee',
        email TEXT,
        phone TEXT,
        hourly_rate REAL,
        specialty TEXT,
        license_number TEXT,
        insurance_expiry TEXT,
        status TEXT DEFAULT 'active',
        notes TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      )`,

      // Crew Assignments (assign crew to jobs/phases)
      `CREATE TABLE IF NOT EXISTS crew_assignments (
        id TEXT PRIMARY KEY,
        crew_member_id TEXT NOT NULL,
        job_id TEXT NOT NULL,
        phase_id TEXT,
        start_date TEXT,
        end_date TEXT,
        scheduled_hours REAL,
        status TEXT DEFAULT 'scheduled',
        notes TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      )`,

      // Expense Categories
      `CREATE TABLE IF NOT EXISTS categories (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        name TEXT NOT NULL,
        icon TEXT,
        color TEXT,
        deduction_percentage INTEGER DEFAULT 100,
        is_default INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now'))
      )`,

      // Expenses
      `CREATE TABLE IF NOT EXISTS expenses (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        amount REAL NOT NULL,
        description TEXT,
        category_id TEXT,
        date TEXT NOT NULL,
        vendor TEXT,
        is_business INTEGER DEFAULT 1,
        payment_method TEXT,
        receipt_url TEXT,
        job_id TEXT,
        notes TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      )`,

      // Budgets
      `CREATE TABLE IF NOT EXISTS budgets (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        category_id TEXT,
        budget_amount REAL NOT NULL,
        period TEXT DEFAULT 'monthly',
        start_date TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      )`,

      // Mileage
      `CREATE TABLE IF NOT EXISTS mileage (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        trip_date TEXT NOT NULL,
        miles REAL NOT NULL,
        purpose TEXT NOT NULL,
        start_location TEXT,
        end_location TEXT,
        is_round_trip INTEGER DEFAULT 0,
        notes TEXT,
        job_id TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      )`,

      // Time Entries
      `CREATE TABLE IF NOT EXISTS time_entries (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        job_id TEXT NOT NULL,
        date TEXT NOT NULL,
        hours REAL NOT NULL,
        hourly_rate REAL,
        description TEXT,
        notes TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      )`,

      // Estimates
      `CREATE TABLE IF NOT EXISTS estimates (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        job_id TEXT,
        contact_id TEXT,
        title TEXT,
        po_number TEXT,
        client_name TEXT,
        client_email TEXT,
        client_phone TEXT,
        client_address TEXT,
        project_address TEXT,
        estimate_date TEXT,
        payment_terms TEXT,
        scope_of_work TEXT,
        status TEXT DEFAULT 'draft',
        subtotal REAL DEFAULT 0,
        discount_type TEXT DEFAULT 'percent',
        discount_value REAL DEFAULT 0,
        discount_amount REAL DEFAULT 0,
        tax_rate REAL DEFAULT 0,
        tax_amount REAL DEFAULT 0,
        total REAL DEFAULT 0,
        notes TEXT,
        terms_and_conditions TEXT,
        valid_until TEXT,
        public_token TEXT UNIQUE,
        sent_at TEXT,
        viewed_at TEXT,
        accepted_at TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      )`,

      // Estimate Line Items
      `CREATE TABLE IF NOT EXISTS estimate_items (
        id TEXT PRIMARY KEY,
        estimate_id TEXT NOT NULL,
        description TEXT NOT NULL,
        quantity REAL DEFAULT 1,
        unit TEXT,
        unit_price REAL DEFAULT 0,
        total REAL DEFAULT 0,
        is_optional INTEGER DEFAULT 0,
        sort_order INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now'))
      )`,

      // Recurring Expenses
      `CREATE TABLE IF NOT EXISTS recurring_expenses (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        amount REAL NOT NULL,
        description TEXT NOT NULL,
        category_id TEXT,
        vendor TEXT,
        frequency TEXT DEFAULT 'monthly',
        next_due TEXT,
        is_active INTEGER DEFAULT 1,
        payment_method TEXT,
        is_business INTEGER DEFAULT 1,
        notes TEXT,
        last_generated TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      )`,

      // Receipts
      `CREATE TABLE IF NOT EXISTS receipts (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        expense_id TEXT,
        file_url TEXT NOT NULL,
        file_name TEXT,
        file_type TEXT,
        ocr_data TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      )`,

      // Job Permits
      `CREATE TABLE IF NOT EXISTS permits (
        id TEXT PRIMARY KEY,
        job_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        permit_type TEXT,
        permit_number TEXT,
        authority TEXT,
        status TEXT DEFAULT 'pending',
        applied_date TEXT,
        approved_date TEXT,
        expires_date TEXT,
        inspection_date TEXT,
        fee REAL,
        notes TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      )`,

      // Job Phases (user's job-specific phases)
      `CREATE TABLE IF NOT EXISTS job_phases (
        id TEXT PRIMARY KEY,
        job_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        name TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        sort_order INTEGER DEFAULT 0,
        start_date TEXT,
        end_date TEXT,
        notes TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      )`,

      // Job Tasks
      `CREATE TABLE IF NOT EXISTS job_tasks (
        id TEXT PRIMARY KEY,
        job_id TEXT NOT NULL,
        phase_id TEXT,
        user_id TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        status TEXT DEFAULT 'pending',
        priority TEXT DEFAULT 'medium',
        assigned_to TEXT,
        due_date TEXT,
        completed_at TEXT,
        sort_order INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      )`,

      // Job Materials
      `CREATE TABLE IF NOT EXISTS job_materials (
        id TEXT PRIMARY KEY,
        job_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        quantity REAL DEFAULT 1,
        unit TEXT,
        unit_cost REAL,
        total_cost REAL,
        vendor TEXT,
        status TEXT DEFAULT 'needed',
        ordered_date TEXT,
        received_date TEXT,
        notes TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      )`,

      // Industry Phases (for seeding)
      `CREATE TABLE IF NOT EXISTS industry_phases (
        id TEXT PRIMARY KEY,
        industry_id TEXT NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        sort_order INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now'))
      )`,

      // Industry Tasks (for seeding)
      `CREATE TABLE IF NOT EXISTS industry_tasks (
        id TEXT PRIMARY KEY,
        industry_id TEXT NOT NULL,
        phase_id TEXT,
        name TEXT NOT NULL,
        description TEXT,
        is_default INTEGER DEFAULT 1,
        sort_order INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now'))
      )`,

      // Industry Fields (custom fields per industry)
      `CREATE TABLE IF NOT EXISTS industry_fields (
        id TEXT PRIMARY KEY,
        industry_id TEXT NOT NULL,
        field_name TEXT NOT NULL,
        field_label TEXT NOT NULL,
        field_type TEXT DEFAULT 'text',
        is_required INTEGER DEFAULT 0,
        options TEXT,
        sort_order INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now'))
      )`,

      // User Phases (user-specific phases seeded from industry)
      `CREATE TABLE IF NOT EXISTS user_phases (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        name TEXT NOT NULL,
        phase_order INTEGER DEFAULT 0,
        tasks TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      )`,

      // User Fields (user-specific custom fields seeded from industry)
      `CREATE TABLE IF NOT EXISTS user_fields (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        field_name TEXT NOT NULL,
        field_label TEXT NOT NULL,
        field_type TEXT DEFAULT 'text',
        field_options TEXT,
        field_order INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now'))
      )`,

      // Indexes
      `CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`,
      `CREATE INDEX IF NOT EXISTS idx_tools_user_id ON tools(user_id)`,
      `CREATE INDEX IF NOT EXISTS idx_tools_qr_code ON tools(qr_code)`,
      `CREATE INDEX IF NOT EXISTS idx_tools_status ON tools(status)`,
      `CREATE INDEX IF NOT EXISTS idx_tool_checkouts_tool_id ON tool_checkouts(tool_id)`,
      `CREATE INDEX IF NOT EXISTS idx_jobs_user_id ON jobs(user_id)`,
      `CREATE INDEX IF NOT EXISTS idx_todos_user_id ON todos(user_id)`,
      `CREATE INDEX IF NOT EXISTS idx_todos_status ON todos(status)`,
      `CREATE INDEX IF NOT EXISTS idx_todos_due_date ON todos(due_date)`,
      `CREATE INDEX IF NOT EXISTS idx_contacts_user_id ON contacts(user_id)`,
      `CREATE INDEX IF NOT EXISTS idx_contacts_type ON contacts(type)`,
      `CREATE INDEX IF NOT EXISTS idx_expenses_user_id ON expenses(user_id)`,
      `CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date)`,
      `CREATE INDEX IF NOT EXISTS idx_budgets_user_id ON budgets(user_id)`,
      `CREATE INDEX IF NOT EXISTS idx_mileage_user_id ON mileage(user_id)`,
      `CREATE INDEX IF NOT EXISTS idx_mileage_trip_date ON mileage(trip_date)`,
      `CREATE INDEX IF NOT EXISTS idx_time_entries_user_id ON time_entries(user_id)`,
      `CREATE INDEX IF NOT EXISTS idx_time_entries_job_id ON time_entries(job_id)`,
      `CREATE INDEX IF NOT EXISTS idx_estimates_user_id ON estimates(user_id)`,
      `CREATE INDEX IF NOT EXISTS idx_estimates_job_id ON estimates(job_id)`,
      `CREATE INDEX IF NOT EXISTS idx_estimate_items_estimate_id ON estimate_items(estimate_id)`,
      `CREATE INDEX IF NOT EXISTS idx_recurring_expenses_user_id ON recurring_expenses(user_id)`,
      `CREATE INDEX IF NOT EXISTS idx_industry_phases_industry_id ON industry_phases(industry_id)`,
      `CREATE INDEX IF NOT EXISTS idx_industry_tasks_industry_id ON industry_tasks(industry_id)`,
      `CREATE INDEX IF NOT EXISTS idx_industry_fields_industry_id ON industry_fields(industry_id)`,
      `CREATE INDEX IF NOT EXISTS idx_user_phases_user_id ON user_phases(user_id)`,
      `CREATE INDEX IF NOT EXISTS idx_user_fields_user_id ON user_fields(user_id)`,
      `CREATE INDEX IF NOT EXISTS idx_permits_job_id ON permits(job_id)`,
      `CREATE INDEX IF NOT EXISTS idx_permits_user_id ON permits(user_id)`,
      `CREATE INDEX IF NOT EXISTS idx_job_phases_job_id ON job_phases(job_id)`,
      `CREATE INDEX IF NOT EXISTS idx_job_phases_user_id ON job_phases(user_id)`,
      `CREATE INDEX IF NOT EXISTS idx_job_tasks_job_id ON job_tasks(job_id)`,
      `CREATE INDEX IF NOT EXISTS idx_job_tasks_user_id ON job_tasks(user_id)`,
      `CREATE INDEX IF NOT EXISTS idx_job_tasks_phase_id ON job_tasks(phase_id)`,
      `CREATE INDEX IF NOT EXISTS idx_job_materials_job_id ON job_materials(job_id)`,
      `CREATE INDEX IF NOT EXISTS idx_job_materials_user_id ON job_materials(user_id)`,
      `CREATE INDEX IF NOT EXISTS idx_crew_members_user_id ON crew_members(user_id)`,
      `CREATE INDEX IF NOT EXISTS idx_crew_assignments_crew_member_id ON crew_assignments(crew_member_id)`,
      `CREATE INDEX IF NOT EXISTS idx_crew_assignments_job_id ON crew_assignments(job_id)`,
      `CREATE INDEX IF NOT EXISTS idx_tool_checkouts_job_id ON tool_checkouts(checked_out_to_job_id)`,

      // =====================================================
      // PHASE 1: QUOTE ENGINE - GC EXPANSION
      // =====================================================

      // CSI Cost Codes
      `CREATE TABLE IF NOT EXISTS cost_codes (
        id TEXT PRIMARY KEY,
        code TEXT NOT NULL,
        division TEXT NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        parent_code TEXT,
        level INTEGER DEFAULT 1,
        is_default INTEGER DEFAULT 1,
        user_id TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      )`,

      // Subcontractors
      `CREATE TABLE IF NOT EXISTS subcontractors (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        company_name TEXT NOT NULL,
        contact_name TEXT,
        email TEXT,
        phone TEXT,
        address TEXT,
        city TEXT,
        state TEXT,
        zip TEXT,
        primary_trade TEXT,
        csi_divisions TEXT,
        license_number TEXT,
        license_state TEXT,
        license_expiry TEXT,
        license_verified INTEGER DEFAULT 0,
        insurance_company TEXT,
        insurance_policy_number TEXT,
        insurance_expiry TEXT,
        insurance_amount REAL,
        coi_on_file INTEGER DEFAULT 0,
        additional_insured INTEGER DEFAULT 0,
        waiver_of_subrogation INTEGER DEFAULT 0,
        w9_on_file INTEGER DEFAULT 0,
        tax_id TEXT,
        workers_comp_policy TEXT,
        workers_comp_expiry TEXT,
        safety_plan_on_file INTEGER DEFAULT 0,
        osha_certified INTEGER DEFAULT 0,
        emr_rating REAL,
        rating INTEGER,
        projects_completed INTEGER DEFAULT 0,
        is_preferred INTEGER DEFAULT 0,
        is_active INTEGER DEFAULT 1,
        notes TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      )`,

      // Subcontractor Documents
      `CREATE TABLE IF NOT EXISTS subcontractor_documents (
        id TEXT PRIMARY KEY,
        subcontractor_id TEXT NOT NULL,
        type TEXT NOT NULL,
        name TEXT NOT NULL,
        url TEXT NOT NULL,
        expiry_date TEXT,
        verified INTEGER DEFAULT 0,
        verified_at TEXT,
        verified_by TEXT,
        notes TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      )`,

      // Bid Packages
      `CREATE TABLE IF NOT EXISTS bid_packages (
        id TEXT PRIMARY KEY,
        job_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        package_number TEXT,
        name TEXT NOT NULL,
        csi_division TEXT,
        description TEXT,
        scope_of_work TEXT,
        inclusions TEXT,
        exclusions TEXT,
        bid_due_date TEXT,
        work_start_date TEXT,
        work_end_date TEXT,
        budget_estimate REAL,
        status TEXT DEFAULT 'draft',
        awarded_to TEXT,
        awarded_amount REAL,
        awarded_at TEXT,
        attachments TEXT,
        notes TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      )`,

      // Bid Package Invites
      `CREATE TABLE IF NOT EXISTS bid_package_invites (
        id TEXT PRIMARY KEY,
        bid_package_id TEXT NOT NULL,
        subcontractor_id TEXT NOT NULL,
        invited_at TEXT DEFAULT (datetime('now')),
        invited_via TEXT DEFAULT 'email',
        status TEXT DEFAULT 'pending',
        viewed_at TEXT,
        declined_at TEXT,
        decline_reason TEXT,
        notes TEXT
      )`,

      // Subcontractor Bids
      `CREATE TABLE IF NOT EXISTS subcontractor_bids (
        id TEXT PRIMARY KEY,
        bid_package_id TEXT NOT NULL,
        subcontractor_id TEXT NOT NULL,
        base_bid REAL NOT NULL,
        labor_cost REAL,
        material_cost REAL,
        equipment_cost REAL,
        overhead_profit REAL,
        alternates TEXT,
        assumptions TEXT,
        clarifications TEXT,
        exclusions TEXT,
        proposed_start TEXT,
        proposed_duration TEXT,
        lead_time TEXT,
        compliance_verified INTEGER DEFAULT 0,
        status TEXT DEFAULT 'submitted',
        score INTEGER,
        evaluator_notes TEXT,
        attachments TEXT,
        submitted_at TEXT DEFAULT (datetime('now')),
        reviewed_at TEXT
      )`,

      // Bid RFIs
      `CREATE TABLE IF NOT EXISTS bid_rfis (
        id TEXT PRIMARY KEY,
        bid_package_id TEXT NOT NULL,
        subcontractor_id TEXT,
        rfi_number TEXT,
        question TEXT NOT NULL,
        response TEXT,
        responded_at TEXT,
        is_public INTEGER DEFAULT 1,
        attachments TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      )`,

      // Estimate Sections
      `CREATE TABLE IF NOT EXISTS estimate_sections (
        id TEXT PRIMARY KEY,
        estimate_id TEXT NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        cost_code TEXT,
        sort_order INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now'))
      )`,

      // Estimate Line Items (Enhanced)
      `CREATE TABLE IF NOT EXISTS estimate_line_items (
        id TEXT PRIMARY KEY,
        estimate_id TEXT NOT NULL,
        section_id TEXT,
        cost_code_id TEXT,
        bid_package_id TEXT,
        description TEXT NOT NULL,
        quantity REAL DEFAULT 1,
        unit TEXT,
        unit_price REAL DEFAULT 0,
        labor_cost REAL DEFAULT 0,
        labor_hours REAL,
        labor_rate REAL,
        material_cost REAL DEFAULT 0,
        equipment_cost REAL DEFAULT 0,
        subcontractor_cost REAL DEFAULT 0,
        subtotal REAL DEFAULT 0,
        markup_percent REAL DEFAULT 0,
        markup_amount REAL DEFAULT 0,
        total REAL DEFAULT 0,
        is_optional INTEGER DEFAULT 0,
        is_allowance INTEGER DEFAULT 0,
        is_alternate INTEGER DEFAULT 0,
        alternate_type TEXT,
        include_in_sov INTEGER DEFAULT 1,
        sov_description TEXT,
        sort_order INTEGER DEFAULT 0,
        notes TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      )`,

      // Estimate Allowances
      `CREATE TABLE IF NOT EXISTS estimate_allowances (
        id TEXT PRIMARY KEY,
        estimate_id TEXT NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        amount REAL NOT NULL,
        cost_code_id TEXT,
        is_owner_selection INTEGER DEFAULT 1,
        status TEXT DEFAULT 'pending',
        actual_amount REAL,
        variance REAL,
        notes TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      )`,

      // Estimate Alternates
      `CREATE TABLE IF NOT EXISTS estimate_alternates (
        id TEXT PRIMARY KEY,
        estimate_id TEXT NOT NULL,
        alternate_number TEXT,
        name TEXT NOT NULL,
        description TEXT,
        type TEXT NOT NULL,
        amount REAL NOT NULL,
        cost_code_id TEXT,
        status TEXT DEFAULT 'proposed',
        accepted_at TEXT,
        notes TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      )`,

      // Estimate Contingency
      `CREATE TABLE IF NOT EXISTS estimate_contingency (
        id TEXT PRIMARY KEY,
        estimate_id TEXT NOT NULL,
        name TEXT DEFAULT 'Contingency',
        description TEXT,
        type TEXT DEFAULT 'percent',
        percent_value REAL,
        fixed_value REAL,
        calculated_amount REAL,
        applies_to TEXT DEFAULT 'all',
        notes TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      )`,

      // Estimate Overhead & Profit
      `CREATE TABLE IF NOT EXISTS estimate_overhead_profit (
        id TEXT PRIMARY KEY,
        estimate_id TEXT NOT NULL,
        overhead_percent REAL DEFAULT 0,
        overhead_amount REAL DEFAULT 0,
        profit_percent REAL DEFAULT 0,
        profit_amount REAL DEFAULT 0,
        total REAL DEFAULT 0,
        notes TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      )`,

      // Schedule of Values
      `CREATE TABLE IF NOT EXISTS schedule_of_values (
        id TEXT PRIMARY KEY,
        job_id TEXT NOT NULL,
        estimate_id TEXT,
        user_id TEXT NOT NULL,
        name TEXT DEFAULT 'Schedule of Values',
        version INTEGER DEFAULT 1,
        status TEXT DEFAULT 'draft',
        total_contract_amount REAL DEFAULT 0,
        approved_at TEXT,
        approved_by TEXT,
        notes TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      )`,

      // SOV Line Items
      `CREATE TABLE IF NOT EXISTS sov_line_items (
        id TEXT PRIMARY KEY,
        sov_id TEXT NOT NULL,
        line_number TEXT,
        cost_code_id TEXT,
        description TEXT NOT NULL,
        scheduled_value REAL NOT NULL DEFAULT 0,
        approved_changes REAL DEFAULT 0,
        revised_value REAL DEFAULT 0,
        previous_billed REAL DEFAULT 0,
        current_billed REAL DEFAULT 0,
        total_billed REAL DEFAULT 0,
        percent_complete REAL DEFAULT 0,
        balance_to_finish REAL DEFAULT 0,
        retainage_percent REAL DEFAULT 10,
        retainage_held REAL DEFAULT 0,
        estimate_line_item_id TEXT,
        sort_order INTEGER DEFAULT 0,
        notes TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      )`,

      // Phase 1 Indexes
      `CREATE INDEX IF NOT EXISTS idx_cost_codes_code ON cost_codes(code)`,
      `CREATE INDEX IF NOT EXISTS idx_cost_codes_division ON cost_codes(division)`,
      `CREATE INDEX IF NOT EXISTS idx_subcontractors_user_id ON subcontractors(user_id)`,
      `CREATE INDEX IF NOT EXISTS idx_subcontractors_trade ON subcontractors(primary_trade)`,
      `CREATE INDEX IF NOT EXISTS idx_bid_packages_job_id ON bid_packages(job_id)`,
      `CREATE INDEX IF NOT EXISTS idx_bid_packages_status ON bid_packages(status)`,
      `CREATE INDEX IF NOT EXISTS idx_sub_bids_package ON subcontractor_bids(bid_package_id)`,
      `CREATE INDEX IF NOT EXISTS idx_sub_bids_subcontractor ON subcontractor_bids(subcontractor_id)`,
      `CREATE INDEX IF NOT EXISTS idx_line_items_estimate ON estimate_line_items(estimate_id)`,
      `CREATE INDEX IF NOT EXISTS idx_line_items_section ON estimate_line_items(section_id)`,
      `CREATE INDEX IF NOT EXISTS idx_sov_job_id ON schedule_of_values(job_id)`,

      // =====================================================
      // MULTI-INDUSTRY SUPPORT
      // =====================================================

      // Industry Profiles (Master Configuration)
      `CREATE TABLE IF NOT EXISTS industry_profiles (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        icon TEXT,
        color TEXT,
        enabled_modules TEXT,
        disabled_modules TEXT,
        required_fields TEXT,
        hidden_fields TEXT,
        terminology TEXT,
        default_settings TEXT,
        sort_order INTEGER DEFAULT 0,
        is_active INTEGER DEFAULT 1,
        created_at TEXT DEFAULT (datetime('now'))
      )`,

      // User Industry Settings
      `CREATE TABLE IF NOT EXISTS user_industry_settings (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL UNIQUE,
        industry_id TEXT NOT NULL,
        custom_terminology TEXT,
        custom_settings TEXT,
        onboarding_completed INTEGER DEFAULT 0,
        onboarding_step TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      )`,

      // =====================================================
      // PROPERTY MANAGEMENT TABLES
      // =====================================================

      // Units (Sub-locations within properties)
      `CREATE TABLE IF NOT EXISTS units (
        id TEXT PRIMARY KEY,
        property_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        unit_number TEXT NOT NULL,
        unit_type TEXT,
        floor INTEGER,
        square_footage REAL,
        bedrooms INTEGER,
        bathrooms REAL,
        status TEXT DEFAULT 'vacant',
        current_tenant_id TEXT,
        current_lease_id TEXT,
        market_rent REAL,
        current_rent REAL,
        notes TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      )`,

      // Tenants
      `CREATE TABLE IF NOT EXISTS tenants (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        first_name TEXT NOT NULL,
        last_name TEXT,
        company_name TEXT,
        email TEXT,
        phone TEXT,
        mobile TEXT,
        emergency_contact_name TEXT,
        emergency_contact_phone TEXT,
        status TEXT DEFAULT 'prospect',
        credit_score INTEGER,
        background_check_date TEXT,
        background_check_status TEXT,
        preferred_contact_method TEXT,
        communication_opt_in INTEGER DEFAULT 1,
        notes TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      )`,

      // Leases
      `CREATE TABLE IF NOT EXISTS leases (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        property_id TEXT NOT NULL,
        unit_id TEXT,
        tenant_id TEXT NOT NULL,
        lease_type TEXT DEFAULT 'fixed',
        start_date TEXT NOT NULL,
        end_date TEXT,
        monthly_rent REAL NOT NULL,
        security_deposit REAL,
        pet_deposit REAL,
        rent_due_day INTEGER DEFAULT 1,
        late_fee_amount REAL,
        late_fee_grace_days INTEGER DEFAULT 5,
        status TEXT DEFAULT 'draft',
        move_in_date TEXT,
        move_out_date TEXT,
        move_in_inspection_id TEXT,
        move_out_inspection_id TEXT,
        lease_document_url TEXT,
        notes TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      )`,

      // Work Orders (Service Requests for PM)
      `CREATE TABLE IF NOT EXISTS work_orders (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        property_id TEXT NOT NULL,
        unit_id TEXT,
        tenant_id TEXT,
        work_order_number TEXT,
        title TEXT NOT NULL,
        description TEXT,
        category TEXT,
        priority TEXT DEFAULT 'normal',
        sla_response_hours INTEGER,
        sla_completion_hours INTEGER,
        status TEXT DEFAULT 'new',
        assigned_vendor_id TEXT,
        assigned_at TEXT,
        scheduled_date TEXT,
        scheduled_time_start TEXT,
        scheduled_time_end TEXT,
        access_instructions TEXT,
        permission_to_enter INTEGER DEFAULT 0,
        completed_at TEXT,
        completed_by TEXT,
        resolution_notes TEXT,
        not_to_exceed REAL,
        actual_cost REAL,
        labor_cost REAL,
        parts_cost REAL,
        billable_to TEXT,
        invoice_id TEXT,
        asset_id TEXT,
        photos TEXT,
        tenant_rating INTEGER,
        tenant_feedback TEXT,
        reported_at TEXT DEFAULT (datetime('now')),
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      )`,

      // Vendor Rate Cards
      `CREATE TABLE IF NOT EXISTS vendor_rate_cards (
        id TEXT PRIMARY KEY,
        vendor_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        service_name TEXT NOT NULL,
        service_category TEXT,
        rate_type TEXT DEFAULT 'flat',
        flat_rate REAL,
        hourly_rate REAL,
        minimum_charge REAL,
        after_hours_rate REAL,
        emergency_rate REAL,
        effective_date TEXT,
        expiration_date TEXT,
        is_active INTEGER DEFAULT 1,
        notes TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      )`,

      // Assets (Trackable equipment at properties)
      `CREATE TABLE IF NOT EXISTS assets (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        property_id TEXT,
        unit_id TEXT,
        name TEXT NOT NULL,
        asset_tag TEXT,
        serial_number TEXT,
        category TEXT,
        subcategory TEXT,
        brand TEXT,
        model TEXT,
        year_installed INTEGER,
        location_description TEXT,
        status TEXT DEFAULT 'active',
        condition TEXT DEFAULT 'good',
        purchase_date TEXT,
        purchase_cost REAL,
        warranty_expiry TEXT,
        expected_lifespan_years INTEGER,
        replacement_cost REAL,
        last_service_date TEXT,
        next_service_date TEXT,
        maintenance_schedule_id TEXT,
        documents TEXT,
        notes TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      )`,

      // Asset History
      `CREATE TABLE IF NOT EXISTS asset_history (
        id TEXT PRIMARY KEY,
        asset_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        event_type TEXT NOT NULL,
        event_date TEXT NOT NULL,
        description TEXT,
        performed_by TEXT,
        vendor_id TEXT,
        work_order_id TEXT,
        cost REAL,
        condition_before TEXT,
        condition_after TEXT,
        documents TEXT,
        notes TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      )`,

      // Maintenance Schedules (Preventative maintenance)
      `CREATE TABLE IF NOT EXISTS maintenance_schedules (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        property_id TEXT,
        unit_id TEXT,
        asset_id TEXT,
        name TEXT NOT NULL,
        description TEXT,
        category TEXT,
        frequency_type TEXT NOT NULL,
        frequency_interval INTEGER,
        start_date TEXT NOT NULL,
        end_date TEXT,
        last_completed TEXT,
        next_due TEXT,
        default_vendor_id TEXT,
        estimated_cost REAL,
        is_active INTEGER DEFAULT 1,
        notes TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      )`,

      // Rent Charges
      `CREATE TABLE IF NOT EXISTS rent_charges (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        lease_id TEXT NOT NULL,
        charge_type TEXT NOT NULL,
        description TEXT,
        amount REAL NOT NULL,
        charge_date TEXT NOT NULL,
        due_date TEXT NOT NULL,
        period_start TEXT,
        period_end TEXT,
        status TEXT DEFAULT 'pending',
        amount_paid REAL DEFAULT 0,
        paid_date TEXT,
        payment_method TEXT,
        notes TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      )`,

      // Multi-industry indexes
      `CREATE INDEX IF NOT EXISTS idx_user_industry_user_id ON user_industry_settings(user_id)`,
      `CREATE INDEX IF NOT EXISTS idx_units_property_id ON units(property_id)`,
      `CREATE INDEX IF NOT EXISTS idx_units_user_id ON units(user_id)`,
      `CREATE INDEX IF NOT EXISTS idx_units_status ON units(status)`,
      `CREATE INDEX IF NOT EXISTS idx_tenants_user_id ON tenants(user_id)`,
      `CREATE INDEX IF NOT EXISTS idx_tenants_status ON tenants(status)`,
      `CREATE INDEX IF NOT EXISTS idx_leases_user_id ON leases(user_id)`,
      `CREATE INDEX IF NOT EXISTS idx_leases_property_id ON leases(property_id)`,
      `CREATE INDEX IF NOT EXISTS idx_leases_tenant_id ON leases(tenant_id)`,
      `CREATE INDEX IF NOT EXISTS idx_leases_status ON leases(status)`,
      `CREATE INDEX IF NOT EXISTS idx_work_orders_user_id ON work_orders(user_id)`,
      `CREATE INDEX IF NOT EXISTS idx_work_orders_property_id ON work_orders(property_id)`,
      `CREATE INDEX IF NOT EXISTS idx_work_orders_status ON work_orders(status)`,
      `CREATE INDEX IF NOT EXISTS idx_work_orders_priority ON work_orders(priority)`,
      `CREATE INDEX IF NOT EXISTS idx_work_orders_assigned_vendor ON work_orders(assigned_vendor_id)`,
      `CREATE INDEX IF NOT EXISTS idx_vendor_rate_cards_vendor_id ON vendor_rate_cards(vendor_id)`,
      `CREATE INDEX IF NOT EXISTS idx_vendor_rate_cards_user_id ON vendor_rate_cards(user_id)`,
      `CREATE INDEX IF NOT EXISTS idx_assets_user_id ON assets(user_id)`,
      `CREATE INDEX IF NOT EXISTS idx_assets_property_id ON assets(property_id)`,
      `CREATE INDEX IF NOT EXISTS idx_assets_status ON assets(status)`,
      `CREATE INDEX IF NOT EXISTS idx_assets_category ON assets(category)`,
      `CREATE INDEX IF NOT EXISTS idx_asset_history_asset_id ON asset_history(asset_id)`,
      `CREATE INDEX IF NOT EXISTS idx_asset_history_event_date ON asset_history(event_date)`,
      `CREATE INDEX IF NOT EXISTS idx_maintenance_schedules_user_id ON maintenance_schedules(user_id)`,
      `CREATE INDEX IF NOT EXISTS idx_maintenance_schedules_property_id ON maintenance_schedules(property_id)`,
      `CREATE INDEX IF NOT EXISTS idx_maintenance_schedules_next_due ON maintenance_schedules(next_due)`,
      `CREATE INDEX IF NOT EXISTS idx_rent_charges_user_id ON rent_charges(user_id)`,
      `CREATE INDEX IF NOT EXISTS idx_rent_charges_lease_id ON rent_charges(lease_id)`,
      `CREATE INDEX IF NOT EXISTS idx_rent_charges_status ON rent_charges(status)`,
      `CREATE INDEX IF NOT EXISTS idx_rent_charges_due_date ON rent_charges(due_date)`,
    ];

    // Execute each statement
    for (const sql of statements) {
      await client.execute(sql);
    }

    // Migration: Add columns if they don't exist (for existing installations)
    const migrations = [
      // Try to add password_hash column to existing users table
      `ALTER TABLE users ADD COLUMN password_hash TEXT`,
      `ALTER TABLE users ADD COLUMN company_name TEXT`,
      `ALTER TABLE users ADD COLUMN industry_id TEXT`,
      // Add payment_method to expenses
      `ALTER TABLE expenses ADD COLUMN payment_method TEXT`,
      // Add contact_id to estimates
      `ALTER TABLE estimates ADD COLUMN contact_id TEXT`,
      // Add authority and inspection_date to permits
      `ALTER TABLE permits ADD COLUMN authority TEXT`,
      `ALTER TABLE permits ADD COLUMN inspection_date TEXT`,
      // Add new estimate fields
      `ALTER TABLE estimates ADD COLUMN title TEXT`,
      `ALTER TABLE estimates ADD COLUMN project_address TEXT`,
      `ALTER TABLE estimates ADD COLUMN estimate_date TEXT`,
      `ALTER TABLE estimates ADD COLUMN payment_terms TEXT`,
      `ALTER TABLE estimates ADD COLUMN scope_of_work TEXT`,
      `ALTER TABLE estimates ADD COLUMN terms_and_conditions TEXT`,
      `ALTER TABLE estimates ADD COLUMN discount_type TEXT DEFAULT 'percent'`,
      `ALTER TABLE estimates ADD COLUMN discount_value REAL DEFAULT 0`,
      `ALTER TABLE estimates ADD COLUMN discount_amount REAL DEFAULT 0`,
      // Add unit to estimate_items
      `ALTER TABLE estimate_items ADD COLUMN unit TEXT`,
      // Add is_optional to estimate_items
      `ALTER TABLE estimate_items ADD COLUMN is_optional INTEGER DEFAULT 0`,
      // Add reminder fields to tool_checkouts
      `ALTER TABLE tool_checkouts ADD COLUMN expected_return_date TEXT`,
      `ALTER TABLE tool_checkouts ADD COLUMN reminder_date TEXT`,
      `ALTER TABLE tool_checkouts ADD COLUMN reminder_sent INTEGER DEFAULT 0`,
    ];

    for (const sql of migrations) {
      try {
        await client.execute(sql);
      } catch {
        // Column already exists, ignore error
      }
    }

    // Insert default industries
    const defaultIndustries = [
      ['ind_roofing', 'Roofing', 'Residential and commercial roofing'],
      ['ind_framing', 'Framing', 'Structural framing and carpentry'],
      ['ind_painting', 'Painting', 'Interior and exterior painting'],
      ['ind_concrete', 'Concrete', 'Flatwork, foundations, structural'],
      ['ind_electrical', 'Electrical', 'Residential and commercial electrical'],
      ['ind_plumbing', 'Plumbing', 'Residential and commercial plumbing'],
      ['ind_general', 'General Contracting', 'Full-service general contracting'],
      ['ind_landscaping', 'Landscaping', 'Landscape and hardscape'],
      ['ind_hvac', 'HVAC', 'Heating, ventilation, and air conditioning'],
      ['ind_flooring', 'Flooring', 'Flooring installation and refinishing'],
    ];

    for (const [id, name, description] of defaultIndustries) {
      await client.execute({
        sql: 'INSERT OR IGNORE INTO industries (id, name, description) VALUES (?, ?, ?)',
        args: [id, name, description],
      });
    }

    // Insert industry phases
    const industryPhases = [
      // Roofing phases
      ['ph_roof_1', 'ind_roofing', 'Lead Intake', 1],
      ['ph_roof_2', 'ind_roofing', 'Estimate & Proposal', 2],
      ['ph_roof_3', 'ind_roofing', 'Contract & Permitting', 3],
      ['ph_roof_4', 'ind_roofing', 'Planning & Scheduling', 4],
      ['ph_roof_5', 'ind_roofing', 'Execution', 5],
      ['ph_roof_6', 'ind_roofing', 'Inspection & Punch', 6],
      ['ph_roof_7', 'ind_roofing', 'Closeout & Warranty', 7],
      // Framing phases
      ['ph_frame_1', 'ind_framing', 'Intake', 1],
      ['ph_frame_2', 'ind_framing', 'Estimate', 2],
      ['ph_frame_3', 'ind_framing', 'Contract', 3],
      ['ph_frame_4', 'ind_framing', 'Planning', 4],
      ['ph_frame_5', 'ind_framing', 'Execution', 5],
      ['ph_frame_6', 'ind_framing', 'Inspection', 6],
      ['ph_frame_7', 'ind_framing', 'Closeout', 7],
      // Electrical phases
      ['ph_elec_1', 'ind_electrical', 'Intake', 1],
      ['ph_elec_2', 'ind_electrical', 'Estimate', 2],
      ['ph_elec_3', 'ind_electrical', 'Permits', 3],
      ['ph_elec_4', 'ind_electrical', 'Rough-in', 4],
      ['ph_elec_5', 'ind_electrical', 'Inspection', 5],
      ['ph_elec_6', 'ind_electrical', 'Trim-out', 6],
      ['ph_elec_7', 'ind_electrical', 'Final Closeout', 7],
      // Plumbing phases
      ['ph_plumb_1', 'ind_plumbing', 'Intake', 1],
      ['ph_plumb_2', 'ind_plumbing', 'Diagnosis & Estimate', 2],
      ['ph_plumb_3', 'ind_plumbing', 'Contract', 3],
      ['ph_plumb_4', 'ind_plumbing', 'Rough-in', 4],
      ['ph_plumb_5', 'ind_plumbing', 'Inspection', 5],
      ['ph_plumb_6', 'ind_plumbing', 'Trim', 6],
      ['ph_plumb_7', 'ind_plumbing', 'Closeout', 7],
      // HVAC phases
      ['ph_hvac_1', 'ind_hvac', 'Intake', 1],
      ['ph_hvac_2', 'ind_hvac', 'Load Calculations', 2],
      ['ph_hvac_3', 'ind_hvac', 'Permits', 3],
      ['ph_hvac_4', 'ind_hvac', 'Rough-in', 4],
      ['ph_hvac_5', 'ind_hvac', 'Set & Startup', 5],
      ['ph_hvac_6', 'ind_hvac', 'Inspection', 6],
      ['ph_hvac_7', 'ind_hvac', 'Closeout', 7],
      // General Contractor phases
      ['ph_gc_1', 'ind_general', 'Intake', 1],
      ['ph_gc_2', 'ind_general', 'Preconstruction', 2],
      ['ph_gc_3', 'ind_general', 'Contract', 3],
      ['ph_gc_4', 'ind_general', 'Procurement', 4],
      ['ph_gc_5', 'ind_general', 'Execution', 5],
      ['ph_gc_6', 'ind_general', 'Punch', 6],
      ['ph_gc_7', 'ind_general', 'Closeout', 7],
    ];

    for (const [id, industryId, name, sortOrder] of industryPhases) {
      await client.execute({
        sql: 'INSERT OR IGNORE INTO industry_phases (id, industry_id, name, sort_order) VALUES (?, ?, ?, ?)',
        args: [id, industryId, name, sortOrder],
      });
    }

    // Insert industry-specific fields
    const industryFields = [
      // Roofing fields
      ['fld_roof_1', 'ind_roofing', 'roof_type', 'Roof Type', 'select', 'Shingle,Metal,Tile,Flat,Slate', 1],
      ['fld_roof_2', 'ind_roofing', 'roof_pitch', 'Roof Pitch', 'text', null, 2],
      ['fld_roof_3', 'ind_roofing', 'layers', 'Existing Layers', 'number', null, 3],
      ['fld_roof_4', 'ind_roofing', 'measured_squares', 'Measured Squares', 'number', null, 4],
      ['fld_roof_5', 'ind_roofing', 'deck_condition', 'Deck Condition', 'select', 'Good,Fair,Poor,Needs Replacement', 5],
      ['fld_roof_6', 'ind_roofing', 'dumpster_size', 'Dumpster Size', 'text', null, 6],
      // Electrical fields
      ['fld_elec_1', 'ind_electrical', 'service_size', 'Service Size (Amps)', 'select', '100,150,200,400', 1],
      ['fld_elec_2', 'ind_electrical', 'panel_location', 'Panel Location', 'text', null, 2],
      ['fld_elec_3', 'ind_electrical', 'circuits_needed', 'Circuits Needed', 'number', null, 3],
      // Plumbing fields
      ['fld_plumb_1', 'ind_plumbing', 'pipe_material', 'Pipe Material', 'select', 'PVC,Copper,PEX,Cast Iron,Galvanized', 1],
      ['fld_plumb_2', 'ind_plumbing', 'fixtures_count', 'Fixture Count', 'number', null, 2],
      ['fld_plumb_3', 'ind_plumbing', 'water_heater_type', 'Water Heater Type', 'select', 'Tank,Tankless,Heat Pump', 3],
      // HVAC fields
      ['fld_hvac_1', 'ind_hvac', 'system_type', 'System Type', 'select', 'Split,Package,Mini-Split,Geothermal', 1],
      ['fld_hvac_2', 'ind_hvac', 'tonnage', 'Tonnage/BTU', 'text', null, 2],
      ['fld_hvac_3', 'ind_hvac', 'seer_rating', 'SEER Rating', 'number', null, 3],
      // Painting fields
      ['fld_paint_1', 'ind_painting', 'surface_type', 'Surface Type', 'select', 'Drywall,Wood,Stucco,Brick,Metal', 1],
      ['fld_paint_2', 'ind_painting', 'coat_count', 'Number of Coats', 'select', '1,2,3', 2],
      ['fld_paint_3', 'ind_painting', 'paint_type', 'Paint Type', 'select', 'Latex,Oil,Primer,Stain', 3],
      // Concrete fields
      ['fld_conc_1', 'ind_concrete', 'concrete_type', 'Concrete Type', 'select', 'Flatwork,Foundation,Structural,Decorative', 1],
      ['fld_conc_2', 'ind_concrete', 'psi_rating', 'PSI Rating', 'select', '2500,3000,3500,4000,4500', 2],
      ['fld_conc_3', 'ind_concrete', 'reinforcement', 'Reinforcement', 'select', 'None,Wire Mesh,Rebar,Fiber', 3],
      // Framing fields
      ['fld_frame_1', 'ind_framing', 'lumber_species', 'Lumber Species', 'select', 'SPF,Doug Fir,LVL,Engineered', 1],
      ['fld_frame_2', 'ind_framing', 'wall_type', 'Wall Type', 'select', 'Load Bearing,Non-Load Bearing,Shear', 2],
      // Landscaping fields
      ['fld_land_1', 'ind_landscaping', 'project_type', 'Project Type', 'select', 'Softscape,Hardscape,Irrigation,Lighting,Full Design', 1],
      ['fld_land_2', 'ind_landscaping', 'irrigation_zones', 'Irrigation Zones', 'number', null, 2],
      // Flooring fields
      ['fld_floor_1', 'ind_flooring', 'flooring_type', 'Flooring Type', 'select', 'Hardwood,Laminate,LVP,Tile,Carpet', 1],
      ['fld_floor_2', 'ind_flooring', 'square_footage', 'Square Footage', 'number', null, 2],
      ['fld_floor_3', 'ind_flooring', 'subfloor_condition', 'Subfloor Condition', 'select', 'Good,Needs Leveling,Needs Replacement', 3],
    ];

    for (const [id, industryId, fieldName, fieldLabel, fieldType, options, sortOrder] of industryFields) {
      await client.execute({
        sql: 'INSERT OR IGNORE INTO industry_fields (id, industry_id, field_name, field_label, field_type, options, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)',
        args: [id, industryId, fieldName, fieldLabel, fieldType, options, sortOrder],
      });
    }

    // Insert default tool categories
    const defaultCategories = [
      ['tcat_power', 'Power Tools', 'Electric and battery-powered tools', 'zap', '#f59e0b'],
      ['tcat_hand', 'Hand Tools', 'Manual non-powered tools', 'wrench', '#3b82f6'],
      ['tcat_safety', 'Safety Equipment', 'PPE and safety gear', 'shield', '#10b981'],
      ['tcat_ladder', 'Ladders & Scaffolding', 'Height access equipment', 'arrow-up', '#8b5cf6'],
      ['tcat_measure', 'Measuring & Layout', 'Measuring tapes, levels, lasers', 'ruler', '#ec4899'],
      ['tcat_cutting', 'Cutting Tools', 'Saws, blades, cutting equipment', 'scissors', '#ef4444'],
      ['tcat_fasten', 'Fastening Tools', 'Nail guns, staplers, screw guns', 'link', '#6366f1'],
      ['tcat_heavy', 'Heavy Equipment', 'Large machinery and vehicles', 'truck', '#78716c'],
      ['tcat_special', 'Specialty Tools', 'Trade-specific specialized tools', 'star', '#14b8a6'],
      ['tcat_consumable', 'Consumables', 'Bits, blades, batteries, supplies', 'package', '#64748b'],
    ];

    for (const [id, name, description, icon, color] of defaultCategories) {
      await client.execute({
        sql: 'INSERT OR IGNORE INTO tool_categories (id, name, description, icon, color) VALUES (?, ?, ?, ?, ?)',
        args: [id, name, description, icon, color],
      });
    }

    // Insert default CSI MasterFormat divisions
    const csiDivisions = [
      ['csi_00', '00', '00', 'Procurement and Contracting Requirements'],
      ['csi_01', '01', '01', 'General Requirements'],
      ['csi_02', '02', '02', 'Existing Conditions'],
      ['csi_03', '03', '03', 'Concrete'],
      ['csi_04', '04', '04', 'Masonry'],
      ['csi_05', '05', '05', 'Metals'],
      ['csi_06', '06', '06', 'Wood, Plastics, and Composites'],
      ['csi_07', '07', '07', 'Thermal and Moisture Protection'],
      ['csi_08', '08', '08', 'Openings'],
      ['csi_09', '09', '09', 'Finishes'],
      ['csi_10', '10', '10', 'Specialties'],
      ['csi_11', '11', '11', 'Equipment'],
      ['csi_12', '12', '12', 'Furnishings'],
      ['csi_13', '13', '13', 'Special Construction'],
      ['csi_14', '14', '14', 'Conveying Equipment'],
      ['csi_21', '21', '21', 'Fire Suppression'],
      ['csi_22', '22', '22', 'Plumbing'],
      ['csi_23', '23', '23', 'HVAC'],
      ['csi_25', '25', '25', 'Integrated Automation'],
      ['csi_26', '26', '26', 'Electrical'],
      ['csi_27', '27', '27', 'Communications'],
      ['csi_28', '28', '28', 'Electronic Safety and Security'],
      ['csi_31', '31', '31', 'Earthwork'],
      ['csi_32', '32', '32', 'Exterior Improvements'],
      ['csi_33', '33', '33', 'Utilities'],
    ];

    for (const [id, code, division, name] of csiDivisions) {
      await client.execute({
        sql: 'INSERT OR IGNORE INTO cost_codes (id, code, division, name, level, is_default) VALUES (?, ?, ?, ?, 1, 1)',
        args: [id, code, division, name],
      });
    }

    // Insert industry profiles (for multi-industry support)
    const industryProfilesData = [
      {
        id: 'gc',
        name: 'General Contractor',
        description: 'Commercial and residential general contracting',
        icon: 'building',
        color: '#3b82f6',
        enabled_modules: JSON.stringify(['jobs', 'estimates', 'sov', 'bid_packages', 'subcontractors', 'change_orders', 'permits', 'time_tracking', 'expenses']),
        terminology: JSON.stringify({ location: 'Job', sub_location: 'Phase', service_provider: 'Subcontractor', stakeholder: 'Client' }),
        default_settings: JSON.stringify({ default_retainage: 10, default_markup: 15 }),
        sort_order: 1,
      },
      {
        id: 'property_mgmt',
        name: 'Property Management',
        description: 'Residential and commercial property management',
        icon: 'home',
        color: '#10b981',
        enabled_modules: JSON.stringify(['properties', 'units', 'tenants', 'leases', 'work_orders', 'vendors', 'assets', 'maintenance_schedules', 'rent_tracking']),
        terminology: JSON.stringify({ location: 'Property', sub_location: 'Unit', service_provider: 'Vendor', stakeholder: 'Tenant' }),
        default_settings: JSON.stringify({ default_late_fee_percent: 5, default_late_grace_days: 5 }),
        sort_order: 2,
      },
      {
        id: 'trade_contractor',
        name: 'Trade Contractor',
        description: 'Electrical, plumbing, HVAC, and specialty trades',
        icon: 'wrench',
        color: '#f59e0b',
        enabled_modules: JSON.stringify(['jobs', 'estimates', 'time_tracking', 'expenses', 'service_calls', 'inventory']),
        terminology: JSON.stringify({ location: 'Job', sub_location: 'Task', service_provider: 'Supplier', stakeholder: 'Customer' }),
        default_settings: JSON.stringify({ default_hourly_rate: 85, default_service_call_fee: 75 }),
        sort_order: 3,
      },
      {
        id: 'developer',
        name: 'Developer / Owner-Builder',
        description: 'Real estate development and owner-builder projects',
        icon: 'layers',
        color: '#8b5cf6',
        enabled_modules: JSON.stringify(['projects', 'estimates', 'sov', 'bid_packages', 'subcontractors', 'financing', 'permits', 'milestones']),
        terminology: JSON.stringify({ location: 'Project', sub_location: 'Phase', service_provider: 'Contractor', stakeholder: 'Investor' }),
        default_settings: JSON.stringify({ default_contingency: 10, default_profit_margin: 20 }),
        sort_order: 4,
      },
    ];

    for (const profile of industryProfilesData) {
      await client.execute({
        sql: `INSERT OR IGNORE INTO industry_profiles
              (id, name, description, icon, color, enabled_modules, terminology, default_settings, sort_order)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          profile.id,
          profile.name,
          profile.description,
          profile.icon,
          profile.color,
          profile.enabled_modules,
          profile.terminology,
          profile.default_settings,
          profile.sort_order,
        ],
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Database initialized successfully',
    });
  } catch (error: any) {
    console.error('Error initializing database:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// GET - Check database status
export async function GET() {
  try {
    const client = getTurso();

    // Try a simple query
    const result = await client.execute('SELECT COUNT(*) as count FROM tool_categories');
    const count = result.rows[0]?.count || 0;

    return NextResponse.json({
      success: true,
      connected: true,
      tool_categories_count: count,
    });
  } catch (error: any) {
    console.error('Error checking database:', error);
    return NextResponse.json(
      { success: false, connected: false, error: error.message },
      { status: 500 }
    );
  }
}
