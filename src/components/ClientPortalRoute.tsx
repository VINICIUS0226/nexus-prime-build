import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

/**
 * Protege o portal do cliente para impedir que usuários com roles internas
 * (admin/employee/super_admin) acessem rotas /client/*.
 */
export const ClientPortalRoute = ({ children }: { children: React.ReactNode }) => {
  const { userRole, user, loading } = useAuth();
  const location = useLocation();
  const isCompanyPreview = new URLSearchParams(location.search).get('preview') === 'empresa';
  const canUseCompanyPreview = userRole === 'admin' || userRole === 'employee';

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if ((userRole === 'admin' || userRole === 'employee') && !isCompanyPreview) {
    return <Navigate to="/dashboard" replace />;
  }

  if ((userRole === 'admin' || userRole === 'employee') && isCompanyPreview && canUseCompanyPreview) {
    return <>{children}</>;
  }

  if (userRole === 'super_admin') {
    return <Navigate to="/admin" replace />;
  }

  // userRole === null => cliente
  return <>{children}</>;
};

