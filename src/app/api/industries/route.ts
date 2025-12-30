import { NextResponse } from 'next/server';
import { getTurso } from '@/lib/turso';

// GET - List all industries
export async function GET() {
  try {
    const client = getTurso();
    const result = await client.execute(
      'SELECT id, name, description FROM industries ORDER BY name'
    );

    return NextResponse.json({
      success: true,
      data: result.rows,
    });
  } catch (error: any) {
    console.error('Error fetching industries:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
