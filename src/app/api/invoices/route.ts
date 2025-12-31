import { NextRequest, NextResponse } from 'next/server';
import { getTurso, generateId } from '@/lib/turso';

// GET /api/invoices - List all invoices
// GET /api/invoices?id=xxx - Get single invoice with items
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const userId = searchParams.get('user_id');
  const invoiceId = searchParams.get('id');
  const status = searchParams.get('status');

  if (!userId) {
    return NextResponse.json({ error: 'user_id is required' }, { status: 400 });
  }

  try {
    const client = getTurso();

    if (invoiceId) {
      // Get single invoice
      const result = await client.execute({
        sql: `SELECT * FROM invoices WHERE id = ? AND user_id = ?`,
        args: [invoiceId, userId],
      });

      if (result.rows.length === 0) {
        return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
      }

      // Get invoice items
      const itemsResult = await client.execute({
        sql: `SELECT * FROM invoice_items WHERE invoice_id = ? ORDER BY sort_order`,
        args: [invoiceId],
      });

      const invoice = {
        ...result.rows[0],
        invoice_items: itemsResult.rows,
      };

      return NextResponse.json({ success: true, data: invoice });
    }

    // Build query for listing
    let sql = `SELECT * FROM invoices WHERE user_id = ?`;
    const args: (string | null)[] = [userId];

    if (status) {
      sql += ' AND status = ?';
      args.push(status);
    }

    sql += ' ORDER BY created_at DESC';

    const result = await client.execute({ sql, args });

    return NextResponse.json({ success: true, data: result.rows });
  } catch (error: any) {
    console.error('Error fetching invoices:', error);
    return NextResponse.json({ error: 'Failed to fetch invoices' }, { status: 500 });
  }
}

// POST /api/invoices - Create invoice with items
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      user_id,
      job_id,
      client_name,
      client_email,
      invoice_number,
      due_date,
      items,
      tax_rate,
      notes,
      status = 'draft',
      subtotal = 0,
      tax_amount = 0,
      total = 0,
    } = body;

    if (!user_id) {
      return NextResponse.json({ error: 'user_id is required' }, { status: 400 });
    }

    const client = getTurso();
    const id = generateId();
    const invoiceNum = invoice_number || `INV-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;

    // Calculate totals from items if provided
    let calcSubtotal = subtotal;
    let calcTaxAmount = tax_amount;
    let calcTotal = total;

    if (items && items.length > 0) {
      calcSubtotal = items.reduce((sum: number, item: any) => sum + (item.quantity * item.rate), 0);
      calcTaxAmount = calcSubtotal * ((tax_rate || 0) / 100);
      calcTotal = calcSubtotal + calcTaxAmount;
    }

    // Create invoice
    await client.execute({
      sql: `
        INSERT INTO invoices (
          id, user_id, job_id, client_name, client_email, invoice_number,
          status, subtotal, tax_rate, tax_amount, total, due_date, notes, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
      `,
      args: [
        id,
        user_id,
        job_id || null,
        client_name || null,
        client_email || null,
        invoiceNum,
        status,
        calcSubtotal,
        tax_rate || 0,
        calcTaxAmount,
        calcTotal,
        due_date || null,
        notes || null,
      ],
    });

    // Create invoice items if provided
    if (items && items.length > 0) {
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const itemId = generateId();
        await client.execute({
          sql: `
            INSERT INTO invoice_items (id, invoice_id, description, quantity, unit_price, total, sort_order, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
          `,
          args: [
            itemId,
            id,
            item.description || '',
            item.quantity || 1,
            item.rate || item.unit_price || 0,
            (item.quantity || 1) * (item.rate || item.unit_price || 0),
            i,
          ],
        });
      }
    }

    // Fetch the created invoice
    const result = await client.execute({
      sql: `SELECT * FROM invoices WHERE id = ?`,
      args: [id],
    });

    return NextResponse.json({ success: true, data: result.rows[0] }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating invoice:', error);
    return NextResponse.json({ error: 'Failed to create invoice' }, { status: 500 });
  }
}

// PUT /api/invoices - Update invoice
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, user_id, items, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const client = getTurso();

    // Build dynamic update query
    const allowedFields = [
      'job_id', 'client_name', 'client_email', 'invoice_number',
      'status', 'subtotal', 'tax_rate', 'tax_amount', 'total',
      'due_date', 'sent_at', 'paid_at', 'notes',
    ];

    const fields: string[] = [];
    const values: (string | number | null)[] = [];

    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key)) {
        fields.push(`${key} = ?`);
        values.push(value as string | number | null);
      }
    }

    // Recalculate totals if items provided
    if (items) {
      const subtotal = items.reduce((sum: number, item: any) => sum + (item.quantity * (item.rate || item.unit_price || 0)), 0);
      const taxRate = updates.tax_rate ?? 0;
      const taxAmount = subtotal * (taxRate / 100);
      const total = subtotal + taxAmount;

      fields.push('subtotal = ?', 'tax_amount = ?', 'total = ?');
      values.push(subtotal, taxAmount, total);
    }

    if (fields.length > 0) {
      values.push(id);
      await client.execute({
        sql: `UPDATE invoices SET ${fields.join(', ')} WHERE id = ?`,
        args: values,
      });
    }

    // Update items if provided
    if (items) {
      // Delete existing items
      await client.execute({
        sql: 'DELETE FROM invoice_items WHERE invoice_id = ?',
        args: [id],
      });

      // Insert new items
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const itemId = generateId();
        await client.execute({
          sql: `
            INSERT INTO invoice_items (id, invoice_id, description, quantity, unit_price, total, sort_order, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
          `,
          args: [
            itemId,
            id,
            item.description || '',
            item.quantity || 1,
            item.rate || item.unit_price || 0,
            (item.quantity || 1) * (item.rate || item.unit_price || 0),
            i,
          ],
        });
      }
    }

    // Fetch updated invoice
    const result = await client.execute({
      sql: `SELECT * FROM invoices WHERE id = ?`,
      args: [id],
    });

    return NextResponse.json({ success: true, data: result.rows[0] });
  } catch (error: any) {
    console.error('Error updating invoice:', error);
    return NextResponse.json({ error: 'Failed to update invoice' }, { status: 500 });
  }
}

// DELETE /api/invoices?id=xxx
export async function DELETE(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 });
  }

  try {
    const client = getTurso();

    // Delete invoice items first
    await client.execute({
      sql: 'DELETE FROM invoice_items WHERE invoice_id = ?',
      args: [id],
    });

    // Delete invoice
    await client.execute({
      sql: 'DELETE FROM invoices WHERE id = ?',
      args: [id],
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting invoice:', error);
    return NextResponse.json({ error: 'Failed to delete invoice' }, { status: 500 });
  }
}
