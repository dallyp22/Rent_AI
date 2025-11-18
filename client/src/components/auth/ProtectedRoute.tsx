import { SignIn } from "@clerk/clerk-react";
import { useAuth } from "@/hooks/useAuth";
import { Skeleton } from "@/components/ui/skeleton";
import { Lock } from "lucide-react";

interface ProtectedRouteProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  requireAuth?: boolean;
  redirectPath?: string;
}

export default function ProtectedRoute({ 
  children, 
  fallback,
  requireAuth = true,
  redirectPath
}: ProtectedRouteProps) {
  const { user, isLoading, isAuthenticated } = useAuth();

  // Show loading state while checking authentication
  if (isLoading) {
    return fallback || (
      <div className="space-y-6 p-6" data-testid="auth-loading">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  // If authentication is required but user is not authenticated
  if (requireAuth && !isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]" data-testid="auth-required">
        <div className="max-w-md w-full space-y-6 p-6">
          <div className="text-center mb-6">
            <Lock className="mx-auto h-12 w-12 text-muted-foreground" />
            <h2 className="mt-4 text-2xl font-bold text-foreground" data-testid="auth-title">
              Authentication Required
            </h2>
            <p className="mt-2 text-muted-foreground" data-testid="auth-description">
              Sign in to access portfolio management features
            </p>
          </div>
          
          <SignIn 
            routing="hash"
            signUpUrl="#/sign-up"
          />
        </div>
      </div>
    );
  }

  // If authentication is required and user is authenticated, or if no auth required
  return <>{children}</>;
}