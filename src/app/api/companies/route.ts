import { NextRequest, NextResponse } from 'next/server';
import { db, companies } from '@/db';
import { desc } from 'drizzle-orm';

export async function GET() {
  if (!db) {
    return NextResponse.json([]);
  }
  try {
    const result = await db.select().from(companies).orderBy(desc(companies.createdAt));
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching companies:', error);
    return NextResponse.json([]);
  }
}

export async function POST(request: NextRequest) {
  if (!db) {
    return NextResponse.json({ error: 'Database not available' }, { status: 503 });
  }
  try {
    const body = await request.json();

    const result = await db.insert(companies).values({
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
    }).returning();

    return NextResponse.json(result[0], { status: 201 });
  } catch (error) {
    console.error('Error creating company:', error);
    return NextResponse.json({ error: 'Failed to create company' }, { status: 500 });
  }
}
