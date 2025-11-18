import { UserButton, SignInButton } from "@clerk/clerk-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Download, LogIn } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

export default function Header() {
  const { isLoading, isAuthenticated } = useAuth();

  return (
    <>
    <header className="bg-card border-b border-border px-6 py-4" data-testid="header">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold" data-testid="page-title">
            Property Analysis Dashboard
          </h2>
          <p className="text-muted-foreground" data-testid="page-description">
            Analyze, compare, and optimize your property pricing
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <Button variant="secondary" data-testid="button-export-report">
            <Download className="mr-2 h-4 w-4" />
            Export Report
          </Button>
          
          {/* Authentication Status */}
          {isLoading ? (
            <Skeleton className="w-8 h-8 rounded-full" data-testid="auth-loading" />
          ) : isAuthenticated ? (
            <UserButton 
              afterSignOutUrl="/"
              appearance={{
                elements: {
                  avatarBox: "w-8 h-8"
                }
              }}
            />
          ) : (
            <SignInButton mode="modal">
              <Button variant="default" data-testid="button-login-header">
                <LogIn className="mr-2 h-4 w-4" />
                Sign In
              </Button>
            </SignInButton>
          )}
        </div>
      </div>
    </header>
    </>
  );
}
