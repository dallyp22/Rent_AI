import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { LogIn, Shield, Building2, BarChart3, TrendingUp, CheckCircle } from "lucide-react";
import { useLocation } from "wouter";

export default function LoginPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    // If user is already authenticated, redirect to intended destination or dashboard
    if (isAuthenticated && !isLoading) {
      const redirectPath = sessionStorage.getItem('auth_redirect_path') || '/portfolio-dashboard';
      sessionStorage.removeItem('auth_redirect_path');
      navigate(redirectPath);
    }
  }, [isAuthenticated, isLoading, navigate]);

  const handleLogin = () => {
    window.location.href = '/api/login';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Checking authentication...</p>
        </div>
      </div>
    );
  }

  if (isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <CheckCircle className="h-12 w-12 text-green-600 mx-auto" />
          <p className="text-foreground">Already authenticated, redirecting...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6" data-testid="login-page">
      <div className="max-w-4xl w-full">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">
            PropertyAnalytics Pro
          </h1>
          <p className="text-xl text-muted-foreground">
            Real Estate Analysis Platform
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
          {/* Features Overview */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-primary" />
                  Portfolio Management
                </CardTitle>
                <CardDescription>
                  Manage multiple properties and track performance across your entire portfolio
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-primary" />
                  Competitive Analysis
                </CardTitle>
                <CardDescription>
                  Compare your properties against market competitors with detailed insights
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  Revenue Optimization
                </CardTitle>
                <CardDescription>
                  Get AI-powered recommendations to optimize pricing and maximize revenue
                </CardDescription>
              </CardHeader>
            </Card>

            <Alert>
              <Shield className="h-4 w-4" />
              <AlertDescription>
                Your data is secure and private. We use industry-standard encryption and never share your property information.
              </AlertDescription>
            </Alert>
          </div>

          {/* Login Card */}
          <Card className="w-full">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl" data-testid="login-title">
                Sign in to continue
              </CardTitle>
              <CardDescription data-testid="login-description">
                Access your property portfolio and analysis tools
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="text-sm text-muted-foreground">
                  <p className="font-medium mb-2">With your account, you can:</p>
                  <ul className="space-y-1 list-disc list-inside">
                    <li>Save and manage property profiles</li>
                    <li>Access portfolio dashboard and analytics</li>
                    <li>Generate detailed analysis reports</li>
                    <li>Track optimization opportunities</li>
                    <li>Export data for further analysis</li>
                  </ul>
                </div>
                
                <Button 
                  onClick={handleLogin}
                  className="w-full"
                  size="lg"
                  data-testid="button-login-main"
                >
                  <LogIn className="mr-2 h-4 w-4" />
                  Sign in with Replit
                </Button>

                <div className="text-xs text-center text-muted-foreground">
                  By signing in, you agree to our Terms of Service and Privacy Policy.
                  Your authentication is handled securely by Replit.
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}