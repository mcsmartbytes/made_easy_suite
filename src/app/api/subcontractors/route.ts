import { NextRequest, NextResponse } from 'next/server';
import { getTurso, generateId } from '@/lib/turso';

// GET - Fetch all subcontractors for a user
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');
    const trade = searchParams.get('trade');
    const activeOnly = searchParams.get('active_only') !== 'false';

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User ID is required' },
        { status: 400 }
      );
    }

    const client = getTurso();

    let sql = `
      SELECT * FROM subcontractors
      WHERE user_id = ?
    `;
    const args: (string | number)[] = [userId];

    if (activeOnly) {
      sql += ' AND is_active = 1';
    }

    if (trade) {
      sql += ' AND primary_trade = ?';
      args.push(trade);
    }

    sql += ' ORDER BY company_name ASC';

    const result = await client.execute({ sql, args });

    const subcontractors = result.rows.map((row: any) => ({
      ...row,
      insurance_amount: row.insurance_amount ? Number(row.insurance_amount) : null,
      emr_rating: row.emr_rating ? Number(row.emr_rating) : null,
      rating: row.rating ? Number(row.rating) : null,
      projects_completed: Number(row.projects_completed || 0),
      license_verified: Boolean(row.license_verified),
      coi_on_file: Boolean(row.coi_on_file),
      additional_insured: Boolean(row.additional_insured),
      waiver_of_subrogation: Boolean(row.waiver_of_subrogation),
      w9_on_file: Boolean(row.w9_on_file),
      safety_plan_on_file: Boolean(row.safety_plan_on_file),
      osha_certified: Boolean(row.osha_certified),
      is_preferred: Boolean(row.is_preferred),
      is_active: Boolean(row.is_active),
      csi_divisions: row.csi_divisions ? JSON.parse(row.csi_divisions) : [],
    }));

    return NextResponse.json({ success: true, data: subcontractors });
  } catch (error: any) {
    console.error('Error fetching subcontractors:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// POST - Create a new subcontractor
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      user_id,
      company_name,
      contact_name,
      email,
      phone,
      address,
      city,
      state,
      zip,
      primary_trade,
      csi_divisions,
      license_number,
      license_state,
      license_expiry,
      insurance_company,
      insurance_policy_number,
      insurance_expiry,
      insurance_amount,
      workers_comp_policy,
      workers_comp_expiry,
      tax_id,
      emr_rating,
      notes,
    } = body;

    if (!user_id || !company_name) {
      return NextResponse.json(
        { success: false, error: 'user_id and company_name are required' },
        { status: 400 }
      );
    }

    const client = getTurso();
    const id = generateId();

    await client.execute({
      sql: `
        INSERT INTO subcontractors (
          id, user_id, company_name, contact_name, email, phone,
          address, city, state, zip, primary_trade, csi_divisions,
          license_number, license_state, license_expiry,
          insurance_company, insurance_policy_number, insurance_expiry, insurance_amount,
          workers_comp_policy, workers_comp_expiry, tax_id, emr_rating, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      args: [
        id,
        user_id,
        company_name,
        contact_name || null,
        email || null,
        phone || null,
        address || null,
        city || null,
        state || null,
        zip || null,
        primary_trade || null,
        csi_divisions ? JSON.stringify(csi_divisions) : null,
        license_number || null,
        license_state || null,
        license_expiry || null,
        insurance_company || null,
        insurance_policy_number || null,
        insurance_expiry || null,
        insurance_amount || null,
        workers_comp_policy || null,
        workers_comp_expiry || null,
        tax_id || null,
        emr_rating || null,
        notes || null,
      ],
    });

    const result = await client.execute({
      sql: 'SELECT * FROM subcontractors WHERE id = ?',
      args: [id],
    });

    return NextResponse.json({ success: true, data: result.rows[0] });
  } catch (error: any) {
    console.error('Error creating subcontractor:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// PUT - Update a subcontractor
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Subcontractor ID is required' },
        { status: 400 }
      );
    }

    const client = getTurso();

    const allowedFields = [
      'company_name', 'contact_name', 'email', 'phone',
      'address', 'city', 'state', 'zip',
      'primary_trade', 'csi_divisions',
      'license_number', 'license_state', 'license_expiry', 'license_verified',
      'insurance_company', 'insurance_policy_number', 'insurance_expiry', 'insurance_amount',
      'coi_on_file', 'additional_insured', 'waiver_of_subrogation',
      'w9_on_file', 'tax_id',
      'workers_comp_policy', 'workers_comp_expiry',
      'safety_plan_on_file', 'osha_certified', 'emr_rating',
      'rating', 'projects_completed', 'is_preferred', 'is_active',
      'notes',
    ];

    const fields: string[] = [];
    const values: (string | number | null)[] = [];

    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key)) {
        fields.push(`${key} = ?`);
        if (key === 'csi_divisions' && Array.isArray(value)) {
          values.push(JSON.stringify(value));
        } else if (typeof value === 'boolean') {
          values.push(value ? 1 : 0);
        } else {
          values.push(value as string | number | null);
        }
      }
    }

    if (fields.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No valid fields to update' },
        { status: 400 }
      );
    }

    fields.push("updated_at = datetime('now')");
    values.push(id);

    await client.execute({
      sql: `UPDATE subcontractors SET ${fields.join(', ')} WHERE id = ?`,
      args: values,
    });

    const result = await client.execute({
      sql: 'SELECT * FROM subcontractors WHERE id = ?',
      args: [id],
    });

    return NextResponse.json({ success: true, data: result.rows[0] });
  } catch (error: any) {
    console.error('Error updating subcontractor:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// DELETE - Delete a subcontractor
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Subcontractor ID is required' },
        { status: 400 }
      );
    }

    const client = getTurso();

    // Delete associated documents first
    await client.execute({
      sql: 'DELETE FROM subcontractor_documents WHERE subcontractor_id = ?',
      args: [id],
    });

    await client.execute({
      sql: 'DELETE FROM subcontractors WHERE id = ?',
      args: [id],
    });

    return NextResponse.json({ success: true, message: 'Subcontractor deleted' });
  } catch (error: any) {
    console.error('Error deleting subcontractor:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
