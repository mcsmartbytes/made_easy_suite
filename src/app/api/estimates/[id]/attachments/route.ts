import { NextRequest, NextResponse } from 'next/server';

// GET - Get attachments for an estimate
// Note: Currently returns empty array as attachments are not yet implemented
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: estimateId } = await params;

    // TODO: Implement attachments storage when needed
    // For now, return empty array to prevent frontend errors
    return NextResponse.json({
      success: true,
      data: [],
    });
  } catch (error: any) {
    console.error('Error fetching estimate attachments:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// POST - Upload attachments (stub for future implementation)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return NextResponse.json(
    { success: false, error: 'Attachments upload not yet implemented' },
    { status: 501 }
  );
}
