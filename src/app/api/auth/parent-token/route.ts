import { NextRequest, NextResponse } from 'next/server';
import { validateParentToken } from '@/lib/supabase';
import { findUserByEmail, findUserById, createUser, generateToken, setAuthCookie } from '@/lib/auth';
import { generateId } from '@/lib/turso';

// POST /api/auth/parent-token
// Validates a parent app's Supabase token and creates a SiteSense session
export async function POST(request: NextRequest) {
  try {
    const { parent_token } = await request.json();

    if (!parent_token) {
      return NextResponse.json(
        { success: false, error: 'Missing parent_token' },
        { status: 400 }
      );
    }

    // Validate the parent token against Supabase
    const validation = await validateParentToken(parent_token);

    if (!validation.valid || !validation.email) {
      return NextResponse.json(
        { success: false, error: validation.error || 'Invalid parent token' },
        { status: 401 }
      );
    }

    // Find or create a SiteSense user with this email
    let existingUser = await findUserByEmail(validation.email);
    let userId: string;
    let userEmail: string;

    if (!existingUser) {
      // Create a new user without password (they'll auth via parent token)
      // Generate a random password since this user will only login via parent token
      const randomPassword = generateId() + generateId(); // Strong random password

      try {
        const newUser = await createUser(
          validation.email,
          randomPassword,
          undefined, // full_name - they can set it later
          undefined  // company_name - they can set it later
        );

        if (!newUser) {
          return NextResponse.json(
            { success: false, error: 'Failed to create user account' },
            { status: 500 }
          );
        }

        userId = newUser.id;
        userEmail = newUser.email;
      } catch (error: any) {
        // If user creation fails (maybe race condition), try to fetch again
        existingUser = await findUserByEmail(validation.email);
        if (!existingUser) {
          return NextResponse.json(
            { success: false, error: 'Failed to create user account' },
            { status: 500 }
          );
        }
        userId = existingUser.id;
        userEmail = existingUser.email;
      }
    } else {
      userId = existingUser.id;
      userEmail = existingUser.email;
    }

    // Generate a SiteSense JWT and set the auth cookie
    const token = generateToken({ userId, email: userEmail });
    await setAuthCookie(token);

    // Fetch the user data to return (findUserById returns User without password_hash)
    const user = await findUserById(userId);

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Failed to retrieve user data' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      user,
    });
  } catch (error: any) {
    console.error('Parent token auth error:', error);
    return NextResponse.json(
      { success: false, error: 'Authentication failed' },
      { status: 500 }
    );
  }
}
