import { useEffect } from "react";
import { useLocation } from "wouter";
import { CheckCircle, Loader2 } from "lucide-react";

export default function AuthCallback() {
  const [, navigate] = useLocation();

  useEffect(() => {
    // Get the redirect path from session storage
    const redirectPath = sessionStorage.getItem('auth_redirect_path');
    
    // Clear the stored redirect path
    sessionStorage.removeItem('auth_redirect_path');
    
    // Navigate to the intended destination or default to portfolio dashboard
    const targetPath = redirectPath || '/portfolio-dashboard';
    
    // Use a small delay to ensure the auth state has been updated
    setTimeout(() => {
      navigate(targetPath);
    }, 1000);
  }, [navigate]);

  return (
    <div className="flex items-center justify-center min-h-screen" data-testid="auth-callback">
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center">
          <div className="relative">
            <CheckCircle className="h-12 w-12 text-green-600" />
            <Loader2 className="h-6 w-6 text-primary animate-spin absolute top-3 left-3" />
          </div>
        </div>
        <div>
          <h2 className="text-2xl font-bold text-foreground mb-2">
            Authentication Successful
          </h2>
          <p className="text-muted-foreground">
            Redirecting you to your destination...
          </p>
        </div>
      </div>
    </div>
  );
}