import { NextRequest, NextResponse } from 'next/server';
import { db, deals, contacts, companies } from '@/db';
import { eq, desc } from 'drizzle-orm';

export async function GET() {
  if (!db) {
    return NextResponse.json([]);
  }
  try {
    const result = await db
      .select({
        id: deals.id,
        title: deals.title,
        value: deals.value,
        stage: deals.stage,
        probability: deals.probability,
        expectedCloseDate: deals.expectedCloseDate,
        actualCloseDate: deals.actualCloseDate,
        description: deals.description,
        contactId: deals.contactId,
        companyId: deals.companyId,
        createdAt: deals.createdAt,
        contact: {
          id: contacts.id,
          firstName: contacts.firstName,
          lastName: contacts.lastName,
        },
        company: {
          id: companies.id,
          name: companies.name,
        },
      })
      .from(deals)
      .leftJoin(contacts, eq(deals.contactId, contacts.id))
      .leftJoin(companies, eq(deals.companyId, companies.id))
      .orderBy(desc(deals.createdAt));

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching deals:', error);
    return NextResponse.json([]);
  }
}

export async function POST(request: NextRequest) {
  if (!db) {
    return NextResponse.json({ error: 'Database not available' }, { status: 503 });
  }
  try {
    const body = await request.json();

    const result = await db.insert(deals).values({
      title: body.title,
      value: body.value || 0,
      stage: body.stage || 'lead',
      probability: body.probability || 0,
      expectedCloseDate: body.expectedCloseDate || null,
      description: body.description || null,
      contactId: body.contactId || null,
      companyId: body.companyId || null,
    }).returning();

    return NextResponse.json(result[0], { status: 201 });
  } catch (error) {
    console.error('Error creating deal:', error);
    return NextResponse.json({ error: 'Failed to create deal' }, { status: 500 });
  }
}
