import { NextRequest, NextResponse } from 'next/server';
import { db, deals } from '@/db';
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
    const result = await db.select().from(deals).where(eq(deals.id, parseInt(id)));

    if (result.length === 0) {
      return NextResponse.json({ error: 'Deal not found' }, { status: 404 });
    }

    return NextResponse.json(result[0]);
  } catch (error) {
    console.error('Error fetching deal:', error);
    return NextResponse.json({ error: 'Failed to fetch deal' }, { status: 500 });
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
      .update(deals)
      .set({
        title: body.title,
        value: body.value || 0,
        stage: body.stage,
        probability: body.probability || 0,
        expectedCloseDate: body.expectedCloseDate || null,
        description: body.description || null,
        contactId: body.contactId || null,
        companyId: body.companyId || null,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(deals.id, parseInt(id)))
      .returning();

    if (result.length === 0) {
      return NextResponse.json({ error: 'Deal not found' }, { status: 404 });
    }

    return NextResponse.json(result[0]);
  } catch (error) {
    console.error('Error updating deal:', error);
    return NextResponse.json({ error: 'Failed to update deal' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!db) {
    return NextResponse.json({ error: 'Database not available' }, { status: 503 });
  }
  try {
    const { id } = await params;
    const body = await request.json();

    const updateData: Record<string, unknown> = { updatedAt: new Date().toISOString() };
    if (body.stage) updateData.stage = body.stage;
    if (body.stage === 'won') updateData.actualCloseDate = new Date().toISOString();

    const result = await db
      .update(deals)
      .set(updateData)
      .where(eq(deals.id, parseInt(id)))
      .returning();

    if (result.length === 0) {
      return NextResponse.json({ error: 'Deal not found' }, { status: 404 });
    }

    return NextResponse.json(result[0]);
  } catch (error) {
    console.error('Error updating deal:', error);
    return NextResponse.json({ error: 'Failed to update deal' }, { status: 500 });
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
    await db.delete(deals).where(eq(deals.id, parseInt(id)));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting deal:', error);
    return NextResponse.json({ error: 'Failed to delete deal' }, { status: 500 });
  }
}
