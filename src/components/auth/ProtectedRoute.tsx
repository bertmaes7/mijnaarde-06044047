import { ReactNode, useEffect } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuthContext } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";

interface ProtectedRouteProps {
  children: ReactNode;
  requireAdmin?: boolean;
}

export function ProtectedRoute({ children, requireAdmin = false }: ProtectedRouteProps) {
  const { user, isLoading, isAdmin, isMemberActive, passwordChangeRequired, signOut } = useAuthContext();
  const location = useLocation();

  useEffect(() => {
    if (!isLoading && user && !isMemberActive) {
      signOut();
    }
  }, [isLoading, user, isMemberActive, signOut]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  // Block inactive members
  if (!isMemberActive) {
    return <Navigate to="/auth" replace />;
  }

  // Redirect to password change if required (but not if already on that page)
  if (passwordChangeRequired && location.pathname !== "/change-password") {
    return <Navigate to="/change-password" replace />;
  }

  if (requireAdmin && !isAdmin) {
    // Non-admins go to member portal
    return <Navigate to="/member" replace />;
  }

  return <>{children}</>;
}
