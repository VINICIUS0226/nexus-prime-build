import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useSuperAdmin } from '@/hooks/useSuperAdmin';
import { Loader2 } from 'lucide-react';

export const SuperAdminRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading: authLoading } = useAuth();
  const { isSuperAdmin, loading: superAdminLoading } = useSuperAdmin();

  if (authLoading || superAdminLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!isSuperAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};
