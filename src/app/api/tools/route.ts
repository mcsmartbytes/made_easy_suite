import { NextRequest, NextResponse } from 'next/server';
import { query, execute, generateId, generateToolQRCode } from '@/lib/turso';

type Tool = {
  id: string;
  name: string;
  description: string | null;
  category_id: string | null;
  brand: string | null;
  model: string | null;
  serial_number: string | null;
  qr_code: string;
  asset_tag: string | null;
  purchase_date: string | null;
  purchase_price: number | null;
  current_value: number | null;
  warranty_expires: string | null;
  status: string;
  condition: string;
  home_location: string | null;
  current_location: string | null;
  assigned_to_job: string | null;
  image_url: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

// GET - fetch all tools for a user
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');
    const status = searchParams.get('status');
    const categoryId = searchParams.get('category_id');

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User ID is required' },
        { status: 400 }
      );
    }

    let sql = `
      SELECT
        t.*,
        tc.id as cat_id, tc.name as cat_name, tc.icon as cat_icon, tc.color as cat_color,
        j.id as job_id, j.name as job_name
      FROM tools t
      LEFT JOIN tool_categories tc ON t.category_id = tc.id
      LEFT JOIN jobs j ON t.assigned_to_job = j.id
      WHERE t.user_id = ?
    `;
    const args: (string | number | null)[] = [userId];

    if (status) {
      sql += ' AND t.status = ?';
      args.push(status);
    }

    if (categoryId) {
      sql += ' AND t.category_id = ?';
      args.push(categoryId);
    }

    sql += ' ORDER BY t.name ASC';

    const rows = await query(sql, args);

    // Transform rows to include nested objects
    const data = rows.map((row: any) => ({
      ...row,
      tool_categories: row.cat_id ? {
        id: row.cat_id,
        name: row.cat_name,
        icon: row.cat_icon,
        color: row.cat_color,
      } : null,
      jobs: row.job_id ? {
        id: row.job_id,
        name: row.job_name,
      } : null,
    }));

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('Error fetching tools:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// POST - create a new tool
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      user_id,
      name,
      description,
      category_id,
      brand,
      model,
      serial_number,
      asset_tag,
      purchase_date,
      purchase_price,
      current_value,
      warranty_expires,
      condition,
      home_location,
      image_url,
      notes,
    } = body;

    if (!user_id || !name) {
      return NextResponse.json(
        { success: false, error: 'User ID and name are required' },
        { status: 400 }
      );
    }

    const id = generateId();
    const qr_code = generateToolQRCode();
    const now = new Date().toISOString();

    await execute(
      `INSERT INTO tools (
        id, user_id, name, description, category_id, brand, model, serial_number,
        qr_code, asset_tag, purchase_date, purchase_price, current_value,
        warranty_expires, status, condition, home_location, current_location,
        image_url, notes, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        user_id,
        name,
        description || null,
        category_id || null,
        brand || null,
        model || null,
        serial_number || null,
        qr_code,
        asset_tag || null,
        purchase_date || null,
        purchase_price ? parseFloat(purchase_price) : null,
        current_value ? parseFloat(current_value) : null,
        warranty_expires || null,
        'available',
        condition || 'good',
        home_location || null,
        home_location || null,
        image_url || null,
        notes || null,
        now,
        now,
      ]
    );

    // Fetch the created tool with category
    const rows = await query(
      `SELECT t.*, tc.id as cat_id, tc.name as cat_name, tc.icon as cat_icon, tc.color as cat_color
       FROM tools t
       LEFT JOIN tool_categories tc ON t.category_id = tc.id
       WHERE t.id = ?`,
      [id]
    );

    const row = rows[0] as any;
    const data = {
      ...row,
      tool_categories: row?.cat_id ? {
        id: row.cat_id,
        name: row.cat_name,
        icon: row.cat_icon,
        color: row.cat_color,
      } : null,
    };

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('Error creating tool:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// PUT - update a tool
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Tool ID is required' },
        { status: 400 }
      );
    }

    // Build dynamic update query
    const fields: string[] = [];
    const values: (string | number | null)[] = [];

    const allowedFields = [
      'name', 'description', 'category_id', 'brand', 'model', 'serial_number',
      'asset_tag', 'purchase_date', 'purchase_price', 'current_value',
      'warranty_expires', 'status', 'condition', 'home_location', 'current_location',
      'assigned_to_job', 'assigned_at', 'image_url', 'notes'
    ];

    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        fields.push(`${field} = ?`);
        let value = updates[field];
        if (field === 'purchase_price' || field === 'current_value') {
          value = value ? parseFloat(value) : null;
        }
        values.push(value);
      }
    }

    if (fields.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No fields to update' },
        { status: 400 }
      );
    }

    fields.push('updated_at = ?');
    values.push(new Date().toISOString());
    values.push(id);

    await execute(
      `UPDATE tools SET ${fields.join(', ')} WHERE id = ?`,
      values
    );

    // Fetch updated tool
    const rows = await query(
      `SELECT t.*, tc.id as cat_id, tc.name as cat_name, tc.icon as cat_icon, tc.color as cat_color,
              j.id as job_id, j.name as job_name
       FROM tools t
       LEFT JOIN tool_categories tc ON t.category_id = tc.id
       LEFT JOIN jobs j ON t.assigned_to_job = j.id
       WHERE t.id = ?`,
      [id]
    );

    const row = rows[0] as any;
    const data = {
      ...row,
      tool_categories: row?.cat_id ? {
        id: row.cat_id,
        name: row.cat_name,
        icon: row.cat_icon,
        color: row.cat_color,
      } : null,
      jobs: row?.job_id ? {
        id: row.job_id,
        name: row.job_name,
      } : null,
    };

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('Error updating tool:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// DELETE - delete a tool
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Tool ID is required' },
        { status: 400 }
      );
    }

    await execute('DELETE FROM tools WHERE id = ?', [id]);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting tool:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
