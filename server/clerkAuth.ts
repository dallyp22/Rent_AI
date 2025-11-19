import { clerkMiddleware, getAuth, requireAuth } from '@clerk/express';
import type { Request, Response, NextFunction } from 'express';

// Export Clerk Express middleware
export { clerkMiddleware, requireAuth };

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
  console.log('[CLERK_AUTH] isAuthenticated check - userId:', auth.userId);
  console.log('[CLERK_AUTH] Full auth object:', JSON.stringify(auth, null, 2));
  
  if (!auth.userId) {
    console.log('[CLERK_AUTH] No userId found - returning 401');
    return res.status(401).json({ message: "Authentication required" });
  }
  
  console.log('[CLERK_AUTH] User authenticated successfully:', auth.userId);
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

