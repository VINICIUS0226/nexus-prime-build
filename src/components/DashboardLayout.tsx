import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useSuperAdmin } from '@/hooks/useSuperAdmin';
import { useStoreConfig } from '@/hooks/useStoreConfig';
import { useIsMobile } from '@/hooks/use-mobile';
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
  Store,
  ShieldCheck,
  HelpCircle,
  PanelLeftClose,
  PanelLeft
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
      { name: 'Ajuda', href: '/dashboard/help', icon: HelpCircle },
    ]
  }
];

export const DashboardLayout = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const { signOut, user } = useAuth();
  const { isSuperAdmin } = useSuperAdmin();
  const { config } = useStoreConfig();
  const isMobile = useIsMobile();
  const [sidebarExpanded, setSidebarExpanded] = useState(false);

  const sidebarCollapsed = isMobile && !sidebarExpanded;
  const sidebarWidth = isMobile ? (sidebarCollapsed ? 'w-16' : 'w-64') : 'w-64';
  const mainPadding = isMobile ? (sidebarCollapsed ? 'pl-16' : 'pl-64') : 'pl-64';

  return (
    <div className="min-h-screen bg-background">
      {/* Overlay para fechar sidebar no mobile quando expandida */}
      {isMobile && sidebarExpanded && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setSidebarExpanded(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 bg-card border-r border-border transition-all duration-300 ease-in-out ${sidebarWidth} ${
          isMobile && sidebarExpanded ? 'shadow-xl' : ''
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Logo + Botão Toggle (mobile) */}
          <div className={`border-b border-border flex items-center ${sidebarCollapsed ? 'p-2 justify-center' : 'p-4 justify-between'}`}>
            {sidebarCollapsed ? (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSidebarExpanded(true)}
                className="w-full"
                aria-label="Expandir menu"
              >
                <PanelLeft className="h-5 w-5" />
              </Button>
            ) : (
              <>
                <Link to="/dashboard" className="flex items-center gap-2 flex-1 min-w-0">
                  {config.store_logo_url ? (
                    <img 
                      src={config.store_logo_url} 
                      alt={config.store_name || 'Logo da Loja'} 
                      className="max-h-12 w-auto object-contain max-w-[140px]" 
                    />
                  ) : (
                    <div className="flex items-center gap-2 text-foreground">
                      <Store className="h-8 w-8 shrink-0" />
                      <span className="font-bold text-lg truncate">
                        {config.store_name || 'Minha Loja'}
                      </span>
                    </div>
                  )}
                </Link>
                {isMobile && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setSidebarExpanded(false)}
                    aria-label="Recolher menu"
                  >
                    <PanelLeftClose className="h-5 w-5" />
                  </Button>
                )}
              </>
            )}
          </div>

          {/* Logo apenas ícone quando collapsed no mobile */}
          {sidebarCollapsed && (
            <div className="p-2 border-b border-border flex justify-center">
              <Link to="/dashboard" className="flex items-center justify-center">
                {config.store_logo_url ? (
                  <img 
                    src={config.store_logo_url} 
                    alt="" 
                    className="h-8 w-8 object-contain rounded" 
                  />
                ) : (
                  <Store className="h-8 w-8 text-foreground" />
                )}
              </Link>
            </div>
          )}

          {/* Navigation */}
          <nav className={`flex-1 overflow-y-auto ${sidebarCollapsed ? 'p-2 space-y-2' : 'p-4 space-y-4'}`}>
            {navigationSections.map((section) => (
              <div key={section.title}>
                {!sidebarCollapsed && (
                  <h3 className="px-4 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {section.title}
                  </h3>
                )}
                <div className="space-y-1">
                  {section.items.map((item) => {
                    const isActive = location.pathname === item.href;
                    return (
                      <Link
                        key={item.name}
                        to={item.href}
                        onClick={() => isMobile && setSidebarExpanded(false)}
                        title={sidebarCollapsed ? item.name : undefined}
                        className={`flex items-center rounded-lg transition-all ${
                          sidebarCollapsed
                            ? 'justify-center p-2.5'
                            : 'gap-3 px-4 py-2.5'
                        } ${
                          isActive
                            ? 'bg-primary text-primary-foreground'
                            : 'text-foreground hover:bg-muted'
                        }`}
                      >
                        <item.icon className="h-4 w-4 shrink-0" />
                        {!sidebarCollapsed && (
                          <span className="text-sm font-medium">{item.name}</span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>

          {/* Super Admin Link */}
          {isSuperAdmin && (
            <div className={sidebarCollapsed ? 'px-2 pb-2' : 'px-4 pb-2'}>
              <Link
                to="/admin"
                onClick={() => isMobile && setSidebarExpanded(false)}
                title={sidebarCollapsed ? 'Painel Super Admin' : undefined}
                className={`flex items-center rounded-lg transition-all bg-purple-600 text-white hover:bg-purple-700 ${
                  sidebarCollapsed ? 'justify-center p-2.5' : 'gap-3 px-4 py-2.5'
                }`}
              >
                <ShieldCheck className="h-4 w-4 shrink-0" />
                {!sidebarCollapsed && (
                  <span className="text-sm font-medium">Painel Super Admin</span>
                )}
              </Link>
            </div>
          )}

          {/* User section */}
          <div className={`border-t border-border ${sidebarCollapsed ? 'p-2' : 'p-4'}`}>
            {sidebarCollapsed ? (
              <div className="flex flex-col items-center gap-2">
                <div className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center shrink-0">
                  <span className="text-sm font-semibold text-secondary-foreground">
                    {user?.email?.charAt(0).toUpperCase()}
                  </span>
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={signOut}
                  title="Sair"
                  aria-label="Sair"
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center shrink-0">
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
              </>
            )}
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className={`${mainPadding} flex flex-col min-h-screen transition-[padding] duration-300`}>
        <DashboardHeader 
          onMenuClick={isMobile ? () => setSidebarExpanded(true) : undefined}
          showMenuButton={isMobile}
        />
        <div className="p-4 md:p-8 flex-1 w-full max-w-6xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
};
