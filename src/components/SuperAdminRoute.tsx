import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useSuperAdmin } from '@/hooks/useSuperAdmin';
import { Loader2 } from 'lucide-react';
import { useMustChangePassword } from '@/hooks/useMustChangePassword';
import { ChangePasswordModal } from '@/components/ChangePasswordModal';

export const SuperAdminRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading: authLoading } = useAuth();
  const { isSuperAdmin, loading: superAdminLoading } = useSuperAdmin();
  const { mustChangePassword, loading: loadingPassword, clearMustChangePassword } = useMustChangePassword();

  if (authLoading || superAdminLoading || loadingPassword) {
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

  if (mustChangePassword) {
    return (
      <>
        {children}
        <ChangePasswordModal
          open={mustChangePassword}
          onPasswordChanged={clearMustChangePassword}
        />
      </>
    );
  }

  return <>{children}</>;
};
