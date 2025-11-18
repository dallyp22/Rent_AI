import { useUser } from '@clerk/clerk-react';

export function useAuth() {
  const { isSignedIn, isLoaded, user: clerkUser } = useUser();
  
  // Transform Clerk user to match application's User interface
  const user = clerkUser ? {
    id: clerkUser.id,
    email: clerkUser.primaryEmailAddress?.emailAddress || '',
    firstName: clerkUser.firstName || '',
    lastName: clerkUser.lastName || '',
    profileImageUrl: clerkUser.imageUrl || '',
  } : null;
  
  return {
    user,
    isLoading: !isLoaded,
    isAuthenticated: isSignedIn || false,
  };
}