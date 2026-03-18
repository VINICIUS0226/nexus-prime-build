import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingCart, Bell, X, Plus, Minus, Trash2, ShoppingBag, PackageCheck, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useCart } from '@/contexts/CartContext';

export interface DashboardHeaderProps {
  onMenuClick?: () => void;
  showMenuButton?: boolean;
  /**
   * Override do comportamento do checkout (ex.: portal do cliente).
   * Se informado, esta função roda no lugar da navegação padrão do dashboard.
   */
  onCheckout?: (
    mode: 'sale' | 'reservation',
    cartData: { variationId: string; quantity: number; unitPrice: number }[]
  ) => void;
  /**
   * Controla se o carrinho deve ser limpo ao clicar em “Vender/Reservar” quando
   * `onCheckout` está ativo.
   */
  clearCartOnCheckout?: boolean;
  /**
   * Texto do botão principal quando o checkout é do tipo "sale".
   * No portal do cliente, usamos "Comprar".
   */
  saleButtonLabel?: string;
  /**
   * Controla se o portal cliente deve mostrar o botão de “Reservar”.
   * No portal, normalmente mostramos apenas “Comprar/Vender”.
   */
  showReservationButton?: boolean;
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  onMenuClick,
  showMenuButton = false,
  onCheckout,
  clearCartOnCheckout,
  saleButtonLabel,
  showReservationButton = true,
}) => {
  const navigate = useNavigate();
  const { items, totalItems, totalValue, updateQuantity, removeItem, clearCart } = useCart();
  const [cartOpen, setCartOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  const handleCheckout = (mode: 'sale' | 'reservation') => {
    if (items.length === 0) return;

    const cartData = items.map(item => ({
      variationId: item.variationId,
      quantity: item.quantity,
      unitPrice: item.unitPrice
    }));

    if (onCheckout) {
      onCheckout(mode, cartData);
      if (clearCartOnCheckout !== false) {
        clearCart();
      }
      setCartOpen(false);
      return;
    }

    const stateData = { prefilledCart: cartData };

    if (mode === 'sale') {
      navigate('/dashboard/sales', { state: stateData });
    } else {
      navigate('/dashboard/reservations', { state: stateData });
    }
    
    clearCart();
    setCartOpen(false);
  };

  return (
    <header className="h-14 border-b border-border bg-card flex items-center justify-between px-4 md:px-6 gap-2">
      {showMenuButton && onMenuClick ? (
        <Button
          variant="ghost"
          size="icon"
          onClick={onMenuClick}
          className="md:hidden"
          aria-label="Abrir menu"
        >
          <Menu className="h-5 w-5" />
        </Button>
      ) : (
        <div className="w-9 md:hidden" aria-hidden />
      )}
      <div className="flex items-center gap-2 ml-auto">
      {/* Notificações */}
      <Popover open={notificationsOpen} onOpenChange={setNotificationsOpen}>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-5 w-5" />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-80">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-semibold">Notificações</h4>
          </div>
          <div className="py-8 text-center text-muted-foreground">
            <Bell className="h-10 w-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Nenhuma notificação</p>
          </div>
        </PopoverContent>
      </Popover>

      {/* Carrinho */}
      <Popover open={cartOpen} onOpenChange={setCartOpen}>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="icon" className="relative">
            <ShoppingCart className="h-5 w-5" />
            {totalItems > 0 && (
              <Badge 
                className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
                variant="destructive"
              >
                {totalItems}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-96 p-0">
          <div className="p-4 border-b">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold flex items-center gap-2">
                <ShoppingCart className="h-4 w-4" />
                Carrinho
                {totalItems > 0 && (
                  <Badge variant="secondary" className="text-xs">{totalItems} itens</Badge>
                )}
              </h4>
              {items.length > 0 && (
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={clearCart}
                  className="text-destructive hover:text-destructive hover:bg-destructive/10 h-7 text-xs"
                >
                  Limpar
                </Button>
              )}
            </div>
          </div>

          {items.length === 0 ? (
            <div className="p-8 text-center">
              <ShoppingBag className="h-12 w-12 mx-auto mb-3 text-muted-foreground/30" />
              <p className="text-muted-foreground font-medium mb-1">Carrinho vazio</p>
              <p className="text-sm text-muted-foreground">
                Adicione produtos ao carrinho
              </p>
            </div>
          ) : (
            <>
              <ScrollArea className="max-h-72">
                <div className="p-4 space-y-3">
                  {items.map((item) => (
                    <div 
                      key={item.variationId}
                      className="flex gap-3 p-2 rounded-lg bg-muted/50"
                    >
                      {item.imageUrl ? (
                        <img 
                          src={item.imageUrl} 
                          alt={item.productName}
                          className="w-12 h-12 rounded object-cover"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded bg-muted flex items-center justify-center">
                          <ShoppingBag className="h-5 w-5 text-muted-foreground" />
                        </div>
                      )}

                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm line-clamp-1">{item.productName}</p>
                        {item.variationInfo && (
                          <p className="text-xs text-muted-foreground">{item.variationInfo}</p>
                        )}
                        <p className="text-sm font-semibold text-primary">
                          R$ {(item.unitPrice * item.quantity).toFixed(2)}
                        </p>
                      </div>

                      <div className="flex flex-col items-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-destructive hover:text-destructive"
                          onClick={() => removeItem(item.variationId)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => updateQuantity(item.variationId, -1)}
                            disabled={item.quantity <= 1}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="w-6 text-center text-sm font-medium">
                            {item.quantity}
                          </span>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => updateQuantity(item.variationId, 1)}
                            disabled={item.quantity >= item.availableStock}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>

              <Separator />

              <div className="p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Total:</span>
                  <span className="text-xl font-bold text-primary">
                    R$ {totalValue.toFixed(2)}
                  </span>
                </div>
                
                <div className="flex gap-2">
                  <Button 
                    className="flex-1"
                    onClick={() => handleCheckout('sale')}
                  >
                    <ShoppingBag className="h-4 w-4 mr-2" />
                    {saleButtonLabel ?? 'Vender'}
                  </Button>
                  {showReservationButton && (
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => handleCheckout('reservation')}
                    >
                      <PackageCheck className="h-4 w-4 mr-2" />
                      Reservar
                    </Button>
                  )}
                </div>
              </div>
            </>
          )}
        </PopoverContent>
      </Popover>
      </div>
    </header>
  );
};
