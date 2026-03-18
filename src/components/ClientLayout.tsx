import React, { useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { DashboardHeader } from '@/components/DashboardHeader';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { useIsMobile } from '@/hooks/use-mobile';
import { Package, ShoppingBag, LogOut } from 'lucide-react';
import { useStoreConfig } from '@/hooks/useStoreConfig';

export const ClientLayout = ({ children }: { children: React.ReactNode }) => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { config } = useStoreConfig();
  const location = useLocation();
  const isMobile = useIsMobile();
  const [sidebarExpanded, setSidebarExpanded] = useState(false);

  const sidebarCollapsed = isMobile && !sidebarExpanded;
  const sidebarWidth = isMobile ? (sidebarCollapsed ? 'w-16' : 'w-64') : 'w-64';
  const mainPadding = isMobile ? (sidebarCollapsed ? 'pl-16' : 'pl-64') : 'pl-64';

  const navItems = useMemo(
    () => [
      { name: 'Produtos', href: '/client/products', icon: ShoppingBag },
      { name: 'Minhas compras', href: '/client/orders', icon: Package },
    ],
    [],
  );

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Overlay para fechar sidebar no mobile */}
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
          <div className={`border-b border-border flex items-center ${sidebarCollapsed ? 'p-2 justify-center' : 'p-4 justify-between'}`}>
            <div className="flex items-center gap-2 min-w-0">
              {config.store_logo_url ? (
                <img
                  src={config.store_logo_url}
                  alt={config.store_name || 'Logo da loja'}
                  className="h-9 w-9 rounded-lg object-contain bg-primary/10"
                />
              ) : (
                <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                  <ShoppingBag className="h-5 w-5" />
                </div>
              )}
              {!sidebarCollapsed && (
                <div className="flex flex-col leading-tight min-w-0">
                  <span className="font-bold text-sm truncate">Portal do Cliente</span>
                  <span className="text-[11px] text-muted-foreground truncate">{config.store_name || 'PQueninos'}</span>
                </div>
              )}
            </div>

            {isMobile && !sidebarCollapsed && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSidebarExpanded(false)}
                aria-label="Recolher menu"
              >
                {/* usa ícone via Package; visual simples */}
                <Package className="h-5 w-5" />
              </Button>
            )}
          </div>

          <nav className={`flex-1 overflow-y-auto ${sidebarCollapsed ? 'p-2 space-y-2' : 'p-4 space-y-3'}`}>
            {navItems.map((item) => {
              const isActive = location.pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  onClick={() => isMobile && setSidebarExpanded(false)}
                  title={sidebarCollapsed ? item.name : undefined}
                  className={`flex items-center rounded-lg transition-all ${
                    sidebarCollapsed ? 'justify-center p-2.5' : 'gap-3 px-4 py-2.5'
                  } ${
                    isActive ? 'bg-primary text-primary-foreground' : 'text-foreground hover:bg-muted'
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {!sidebarCollapsed && <span className="text-sm font-medium">{item.name}</span>}
                </Link>
              );
            })}
          </nav>

          <div className={`border-t border-border ${sidebarCollapsed ? 'p-2' : 'p-4'}`}>
            <div className={`flex items-center gap-3 mb-3 ${sidebarCollapsed ? 'justify-center' : ''}`}>
              <div className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center shrink-0">
                <span className="text-sm font-semibold text-secondary-foreground">
                  {user?.email?.charAt(0)?.toUpperCase() ?? 'C'}
                </span>
              </div>
              {!sidebarCollapsed && (
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{user?.email}</p>
                  <p className="text-xs text-muted-foreground">Cliente</p>
                </div>
              )}
            </div>

            <Button
              variant="outline"
              className={sidebarCollapsed ? 'w-full' : 'w-full'}
              onClick={() => {
                signOut();
              }}
            >
              <LogOut className="mr-2 h-4 w-4" />
              {!sidebarCollapsed && 'Sair'}
            </Button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className={`${mainPadding} flex flex-col min-h-screen transition-[padding] duration-300`}>
        <DashboardHeader
          onMenuClick={isMobile ? () => setSidebarExpanded(true) : undefined}
          showMenuButton={!!isMobile}
          onCheckout={() => {
            navigate('/client/checkout');
          }}
          clearCartOnCheckout={false}
          showReservationButton={false}
          saleButtonLabel="Comprar"
        />

        <div className="p-4 md:p-8 flex-1">{children}</div>
      </main>
    </div>
  );
};

