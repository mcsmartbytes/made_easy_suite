import { NextRequest, NextResponse } from 'next/server';
import { db, contacts } from '@/db';
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
    const result = await db.select().from(contacts).where(eq(contacts.id, parseInt(id)));

    if (result.length === 0) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
    }

    return NextResponse.json(result[0]);
  } catch (error) {
    console.error('Error fetching contact:', error);
    return NextResponse.json({ error: 'Failed to fetch contact' }, { status: 500 });
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
      .update(contacts)
      .set({
        firstName: body.firstName,
        lastName: body.lastName,
        email: body.email || null,
        phone: body.phone || null,
        mobile: body.mobile || null,
        jobTitle: body.jobTitle || null,
        status: body.status,
        source: body.source || null,
        companyId: body.companyId || null,
        notes: body.notes || null,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(contacts.id, parseInt(id)))
      .returning();

    if (result.length === 0) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
    }

    return NextResponse.json(result[0]);
  } catch (error) {
    console.error('Error updating contact:', error);
    return NextResponse.json({ error: 'Failed to update contact' }, { status: 500 });
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
    await db.delete(contacts).where(eq(contacts.id, parseInt(id)));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting contact:', error);
    return NextResponse.json({ error: 'Failed to delete contact' }, { status: 500 });
  }
}
