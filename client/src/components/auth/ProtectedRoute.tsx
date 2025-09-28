import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Lock, LogIn } from "lucide-react";
import AuthDialog from "./AuthDialog";

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
  const [authDialogOpen, setAuthDialogOpen] = useState(false);

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
    const handleLogin = () => {
      setAuthDialogOpen(true);
    };

    return (
      <>
        <div className="flex items-center justify-center min-h-[60vh]" data-testid="auth-required">
          <div className="max-w-md w-full space-y-6 p-6">
            <div className="text-center">
              <Lock className="mx-auto h-12 w-12 text-muted-foreground" />
              <h2 className="mt-4 text-2xl font-bold text-foreground" data-testid="auth-title">
                Authentication Required
              </h2>
              <p className="mt-2 text-muted-foreground" data-testid="auth-description">
                You need to be logged in to access this feature. Please sign in to continue.
              </p>
            </div>
            
            <Alert>
              <Lock className="h-4 w-4" />
              <AlertDescription>
                This section contains portfolio management features that require user authentication 
                to ensure your data security and privacy.
              </AlertDescription>
            </Alert>

            <Button 
              onClick={handleLogin}
              className="w-full"
              size="lg"
              data-testid="button-login"
            >
              <LogIn className="mr-2 h-4 w-4" />
              Sign In
            </Button>
          </div>
        </div>
        
        <AuthDialog 
          open={authDialogOpen} 
          onOpenChange={setAuthDialogOpen}
        />
      </>
    );
  }

  // If authentication is required and user is authenticated, or if no auth required
  return <>{children}</>;
}