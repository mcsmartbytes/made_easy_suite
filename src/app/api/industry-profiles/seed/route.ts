import { NextResponse } from 'next/server';
import { getTurso } from '@/lib/turso';

const INDUSTRY_PROFILES = [
  {
    id: 'gc',
    name: 'General Contractor',
    description: 'Manage construction projects, estimates, subcontractors, and billing',
    icon: 'building',
    color: '#3B82F6',
    enabled_modules: ['jobs', 'estimates', 'sov', 'bid_packages', 'subcontractors', 'cost_codes', 'crews', 'daily_logs', 'rfi', 'submittals'],
    disabled_modules: ['units', 'tenants', 'leases', 'work_orders', 'rent_roll'],
    required_fields: {
      jobs: ['client_id', 'contract_amount'],
      estimates: ['client_id'],
    },
    hidden_fields: {
      jobs: ['tenant_id', 'lease_id', 'unit_id'],
    },
    terminology: {
      job: 'Project',
      client: 'Client',
      estimate: 'Estimate',
      property: 'Job Site',
    },
    default_settings: {
      default_retainage: 10,
      default_markup: 15,
      enable_change_orders: true,
      enable_rfi: true,
    },
    sort_order: 1,
  },
  {
    id: 'property_mgmt',
    name: 'Property Management',
    description: 'Manage rental properties, units, tenants, leases, and maintenance',
    icon: 'home',
    color: '#10B981',
    enabled_modules: ['jobs', 'units', 'tenants', 'leases', 'work_orders', 'rent_roll', 'vendors'],
    disabled_modules: ['estimates', 'sov', 'bid_packages', 'subcontractors', 'cost_codes', 'crews', 'daily_logs'],
    required_fields: {
      jobs: ['property_type', 'address'],
      units: ['property_id', 'unit_number'],
      leases: ['tenant_id', 'monthly_rent'],
    },
    hidden_fields: {
      jobs: ['contract_amount', 'retainage', 'po_number'],
    },
    terminology: {
      job: 'Property',
      client: 'Owner',
      estimate: 'Maintenance Quote',
      property: 'Property',
    },
    default_settings: {
      late_fee_percentage: 5,
      late_fee_grace_days: 5,
      enable_online_payments: true,
      enable_maintenance_requests: true,
    },
    sort_order: 2,
  },
  {
    id: 'trade_contractor',
    name: 'Trade Contractor',
    description: 'Specialized contractor (HVAC, Electrical, Plumbing, etc.) managing bids and jobs',
    icon: 'wrench',
    color: '#F59E0B',
    enabled_modules: ['jobs', 'estimates', 'cost_codes', 'crews', 'daily_logs', 'tools'],
    disabled_modules: ['sov', 'bid_packages', 'subcontractors', 'units', 'tenants', 'leases', 'work_orders'],
    required_fields: {
      jobs: ['client_id', 'trade_type'],
      estimates: ['client_id'],
    },
    hidden_fields: {
      jobs: ['tenant_id', 'lease_id', 'unit_id', 'retainage'],
    },
    terminology: {
      job: 'Job',
      client: 'Customer',
      estimate: 'Quote',
      property: 'Site',
    },
    default_settings: {
      default_markup: 20,
      hourly_rate: 85,
      service_call_fee: 125,
      enable_service_calls: true,
    },
    sort_order: 3,
  },
  {
    id: 'developer',
    name: 'Real Estate Developer',
    description: 'Manage development projects from acquisition to sale or lease-up',
    icon: 'building-office',
    color: '#8B5CF6',
    enabled_modules: ['jobs', 'estimates', 'sov', 'bid_packages', 'subcontractors', 'cost_codes', 'units', 'proforma', 'draws'],
    disabled_modules: ['tenants', 'leases', 'work_orders', 'crews', 'daily_logs'],
    required_fields: {
      jobs: ['project_type', 'total_budget', 'acquisition_date'],
      estimates: ['phase'],
    },
    hidden_fields: {
      jobs: ['tenant_id', 'lease_id'],
    },
    terminology: {
      job: 'Development',
      client: 'Investor',
      estimate: 'Bid Package',
      property: 'Project',
    },
    default_settings: {
      default_retainage: 10,
      contingency_percentage: 5,
      enable_proforma: true,
      enable_draw_schedule: true,
    },
    sort_order: 4,
  },
];

export async function POST() {
  try {
    const client = getTurso();

    // Clear existing profiles
    await client.execute('DELETE FROM industry_profiles');

    // Insert all profiles
    for (const profile of INDUSTRY_PROFILES) {
      await client.execute({
        sql: `INSERT INTO industry_profiles
              (id, name, description, icon, color, enabled_modules, disabled_modules,
               required_fields, hidden_fields, terminology, default_settings, sort_order, is_active)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
        args: [
          profile.id,
          profile.name,
          profile.description,
          profile.icon,
          profile.color,
          JSON.stringify(profile.enabled_modules),
          JSON.stringify(profile.disabled_modules),
          JSON.stringify(profile.required_fields),
          JSON.stringify(profile.hidden_fields),
          JSON.stringify(profile.terminology),
          JSON.stringify(profile.default_settings),
          profile.sort_order,
        ],
      });
    }

    return NextResponse.json({
      success: true,
      message: `Seeded ${INDUSTRY_PROFILES.length} industry profiles`,
      data: INDUSTRY_PROFILES.map(p => ({ id: p.id, name: p.name })),
    });
  } catch (error: any) {
    console.error('Error seeding industry profiles:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
