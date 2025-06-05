import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import Home from "@/pages/home";
import ProfileSetup from "@/pages/profile-setup";
import Invitations from "@/pages/invitations";
import Matches from "@/pages/matches";
import Schedule from "@/pages/schedule";
import Profile from "@/pages/profile";
import ModernChat from "@/pages/modern-chat";
import Login from "@/pages/login";
import Register from "@/pages/register";
import NotFound from "@/pages/not-found";
import { Skeleton } from "@/components/ui/skeleton";

function Router() {
  const { user, isLoading, isInitialized, isAuthenticated } = useAuth();
  const [location] = useLocation();

  // Loading state while checking authentication
  if (!isInitialized || isLoading) {
    return (
      <div className="min-h-screen bg-fitness-light flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-fitness-blue rounded-full flex items-center justify-center mx-auto animate-pulse">
            <div className="w-8 h-8 bg-white rounded"></div>
          </div>
          <Skeleton className="h-4 w-32 mx-auto" />
          <Skeleton className="h-3 w-24 mx-auto" />
        </div>
      </div>
    );
  }

  // Authentication routes (for non-authenticated users)
  if (!isAuthenticated) {
    return (
      <Switch>
        <Route path="/login" component={Login} />
        <Route path="/register" component={Register} />
        <Route path="/" component={Login} />
        <Route component={Login} />
      </Switch>
    );
  }

  // Profile setup required
  if (user && !user.isProfileComplete) {
    return (
      <Switch>
        <Route path="/profile-setup" component={ProfileSetup} />
        <Route path="/" component={ProfileSetup} />
        <Route component={ProfileSetup} />
      </Switch>
    );
  }

  // Protected routes (for authenticated users with complete profiles)
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/profile-setup" component={ProfileSetup} />
      <Route path="/invitations" component={Invitations} />
      <Route path="/matches" component={Matches} />
      <Route path="/schedule" component={Schedule} />
      <Route path="/profile" component={Profile} />
      <Route path="/chat/:invitationId" component={ModernChat} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <div className="mobile-container">
          <Toaster />
          <Router />
        </div>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
