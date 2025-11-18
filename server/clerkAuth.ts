import { ClerkExpressRequireAuth, ClerkExpressWithAuth } from '@clerk/backend';
import type { Request, Response, NextFunction } from 'express';

// Middleware that requires authentication - will return 401 if not authenticated
export const requireAuth = ClerkExpressRequireAuth({
  onError: (error) => {
    console.error('[CLERK_AUTH] Authentication error:', error);
  }
});

// Middleware that optionally checks for authentication - continues even if not authenticated
export const withAuth = ClerkExpressWithAuth({
  onError: (error) => {
    console.error('[CLERK_AUTH] Optional auth check error:', error);
  }
});

/**
 * Get the authenticated Clerk user ID from the request
 * Returns null if user is not authenticated
 */
export function getClerkUserId(req: Request): string | null {
  return (req as any).auth?.userId || null;
}

/**
 * Middleware to check if user is authenticated (any auth method)
 * Replacement for isAuthenticatedAny
 */
export function isAuthenticated(req: Request, res: Response, next: NextFunction) {
  const userId = getClerkUserId(req);
  if (!userId) {
    return res.status(401).json({ message: "Authentication required" });
  }
  next();
}

/**
 * Get authenticated user ID, throwing error if not authenticated
 * Replacement for getAuthenticatedUserId
 */
export function getAuthenticatedUserId(req: Request): string {
  const userId = getClerkUserId(req);
  if (!userId) {
    throw new Error("User not authenticated");
  }
  return userId;
}

