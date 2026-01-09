import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useStoreConfig } from '@/hooks/useStoreConfig';
import { Button } from '@/components/ui/button';
import { DashboardHeader } from '@/components/DashboardHeader';
import { 
  LayoutDashboard, 
  Package, 
  Users, 
  ShoppingCart, 
  DollarSign, 
  BarChart3,
  LogOut,
  Box,
  Settings,
  CreditCard,
  Store
} from 'lucide-react';

const navigationSections = [
  {
    title: 'PRINCIPAL',
    items: [
      { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    ]
  },
  {
    title: 'GESTÃO',
    items: [
      { name: 'Produtos', href: '/dashboard/products', icon: Package },
      { name: 'Clientes', href: '/dashboard/customers', icon: Users },
      { name: 'Estoque', href: '/dashboard/stock', icon: Box },
      { name: 'Reservas', href: '/dashboard/reservations', icon: ShoppingCart },
    ]
  },
  {
    title: 'FINANCEIRO',
    items: [
      { name: 'Vendas', href: '/dashboard/sales', icon: DollarSign },
      { name: 'Pagamentos', href: '/dashboard/payments', icon: CreditCard },
      { name: 'Relatórios', href: '/dashboard/reports', icon: BarChart3 },
    ]
  },
  {
    title: 'SISTEMA',
    items: [
      { name: 'Configurações', href: '/dashboard/settings', icon: Settings },
    ]
  }
];

export const DashboardLayout = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const { signOut, user } = useAuth();
  const { config } = useStoreConfig();

  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 w-64 bg-card border-r border-border">
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-4 border-b border-border">
            <Link to="/dashboard" className="flex items-center justify-center gap-2">
              {config.store_logo_url ? (
                <img 
                  src={config.store_logo_url} 
                  alt={config.store_name || 'Logo da Loja'} 
                  className="max-h-12 w-auto object-contain" 
                />
              ) : (
                <div className="flex items-center gap-2 text-foreground">
                  <Store className="h-8 w-8" />
                  <span className="font-bold text-lg">
                    {config.store_name || 'Minha Loja'}
                  </span>
                </div>
              )}
            </Link>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-4 overflow-y-auto">
            {navigationSections.map((section) => (
              <div key={section.title}>
                <h3 className="px-4 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {section.title}
                </h3>
                <div className="space-y-1">
                  {section.items.map((item) => {
                    const isActive = location.pathname === item.href;
                    return (
                      <Link
                        key={item.name}
                        to={item.href}
                        className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all ${
                        isActive
                            ? 'bg-primary text-primary-foreground'
                            : 'text-foreground hover:bg-muted'
                        }`}
                      >
                        <item.icon className="h-4 w-4" />
                        <span className="text-sm font-medium">{item.name}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>

          {/* User section */}
          <div className="p-4 border-t border-border">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center">
                <span className="text-sm font-semibold text-secondary-foreground">
                  {user?.email?.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{user?.email}</p>
                <p className="text-xs text-muted-foreground">Usuário ativo</p>
              </div>
            </div>
            <Button
              variant="outline"
              className="w-full"
              onClick={signOut}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sair
            </Button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="pl-64 flex flex-col min-h-screen">
        <DashboardHeader />
        <div className="p-8 flex-1">
          {children}
        </div>
      </main>
    </div>
  );
};
