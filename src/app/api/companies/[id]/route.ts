import { NextRequest, NextResponse } from 'next/server';
import { db, companies } from '@/db';
import { eq } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!db) {
    return NextResponse.json({ error: 'Database not available' }, { status: 503 });
  }
  try {
    const { id } = await params;
    const result = await db.select().from(companies).where(eq(companies.id, parseInt(id)));

    if (result.length === 0) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    return NextResponse.json(result[0]);
  } catch (error) {
    console.error('Error fetching company:', error);
    return NextResponse.json({ error: 'Failed to fetch company' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!db) {
    return NextResponse.json({ error: 'Database not available' }, { status: 503 });
  }
  try {
    const { id } = await params;
    const body = await request.json();

    const result = await db
      .update(companies)
      .set({
        name: body.name,
        industry: body.industry || null,
        website: body.website || null,
        phone: body.phone || null,
        email: body.email || null,
        address: body.address || null,
        city: body.city || null,
        state: body.state || null,
        zip: body.zip || null,
        notes: body.notes || null,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(companies.id, parseInt(id)))
      .returning();

    if (result.length === 0) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    return NextResponse.json(result[0]);
  } catch (error) {
    console.error('Error updating company:', error);
    return NextResponse.json({ error: 'Failed to update company' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!db) {
    return NextResponse.json({ error: 'Database not available' }, { status: 503 });
  }
  try {
    const { id } = await params;
    await db.delete(companies).where(eq(companies.id, parseInt(id)));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting company:', error);
    return NextResponse.json({ error: 'Failed to delete company' }, { status: 500 });
  }
}
