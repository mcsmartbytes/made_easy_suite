import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';
import { db, users } from '@/db';
import { eq } from 'drizzle-orm';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_change_in_production';
const TOKEN_EXPIRY = '7d';
const COOKIE_NAME = 'crm_auth';

export interface User {
  id: string;
  email: string;
  fullName: string | null;
  companyName: string | null;
  createdAt: string | null;
}

export interface JWTPayload {
  userId: string;
  email: string;
}

// Generate UUID
export function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Hash password
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

// Verify password
export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

// Generate JWT token
export function generateToken(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: TOKEN_EXPIRY });
}

// Verify JWT token
export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch {
    return null;
  }
}

// Create user in database
export async function createUser(
  email: string,
  password: string,
  fullName?: string,
  companyName?: string
): Promise<User | null> {
  if (!db) throw new Error('Database not initialized');

  const id = generateId();
  const passwordHash = await hashPassword(password);

  try {
    await db.insert(users).values({
      id,
      email: email.toLowerCase(),
      passwordHash,
      fullName: fullName || null,
      companyName: companyName || null,
    });

    const result = await db.select().from(users).where(eq(users.id, id));

    if (result.length === 0) return null;

    const user = result[0];
    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      companyName: user.companyName,
      createdAt: user.createdAt,
    };
  } catch (error: any) {
    if (error.message?.includes('UNIQUE constraint failed')) {
      throw new Error('Email already exists');
    }
    throw error;
  }
}

// Find user by email
export async function findUserByEmail(email: string): Promise<(User & { passwordHash: string }) | null> {
  if (!db) return null;

  const result = await db.select().from(users).where(eq(users.email, email.toLowerCase()));

  if (result.length === 0) return null;

  const user = result[0];
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    companyName: user.companyName,
    createdAt: user.createdAt,
    passwordHash: user.passwordHash,
  };
}

// Find user by ID
export async function findUserById(id: string): Promise<User | null> {
  if (!db) return null;

  const result = await db.select().from(users).where(eq(users.id, id));

  if (result.length === 0) return null;

  const user = result[0];
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    companyName: user.companyName,
    createdAt: user.createdAt,
  };
}

// Set auth cookie
export async function setAuthCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/',
  });
}

// Clear auth cookie
export async function clearAuthCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

// Get current user from cookie
export async function getCurrentUser(): Promise<User | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;

  if (!token) return null;

  const payload = verifyToken(token);
  if (!payload) return null;

  return findUserById(payload.userId);
}

// Get auth token from cookie
export async function getAuthToken(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(COOKIE_NAME)?.value || null;
}

// Login user
export async function loginUser(
  email: string,
  password: string
): Promise<{ user: User; token: string } | null> {
  const user = await findUserByEmail(email);
  if (!user) return null;

  const isValid = await verifyPassword(password, user.passwordHash);
  if (!isValid) return null;

  const token = generateToken({ userId: user.id, email: user.email });

  // Return user without passwordHash
  const { passwordHash, ...userWithoutPassword } = user;
  return { user: userWithoutPassword, token };
}
