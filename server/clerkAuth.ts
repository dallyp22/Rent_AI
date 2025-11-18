import { getAuth } from '@clerk/backend';
import type { Request, Response, NextFunction } from 'express';

/**
 * Get the authenticated Clerk user ID from the request
 * Returns null if user is not authenticated
 */
export function getClerkUserId(req: Request): string | null {
  const auth = getAuth(req);
  return auth.userId || null;
}

/**
 * Middleware to check if user is authenticated
 * Replacement for isAuthenticated and isAuthenticatedAny
 */
export function isAuthenticated(req: Request, res: Response, next: NextFunction) {
  const auth = getAuth(req);
  if (!auth.userId) {
    return res.status(401).json({ message: "Authentication required" });
  }
  next();
}

/**
 * Get authenticated user ID, throwing error if not authenticated
 * Replacement for getAuthenticatedUserId
 */
export function getAuthenticatedUserId(req: Request): string {
  const auth = getAuth(req);
  if (!auth.userId) {
    throw new Error("User not authenticated");
  }
  return auth.userId;
}

