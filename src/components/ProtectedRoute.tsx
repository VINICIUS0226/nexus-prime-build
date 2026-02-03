import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useMustChangePassword } from '@/hooks/useMustChangePassword';
import { ChangePasswordModal } from '@/components/ChangePasswordModal';
import { Loader2 } from 'lucide-react';

export const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  const { mustChangePassword, loading: loadingPassword, clearMustChangePassword } = useMustChangePassword();

  if (loading || loadingPassword) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
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
