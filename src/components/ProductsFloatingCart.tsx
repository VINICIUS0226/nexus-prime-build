import { useState } from 'react';
import { ShoppingCart, X, Plus, Minus, Trash2, ShoppingBag, PackageCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

export interface FloatingCartItem {
  variationId: string;
  productId: string;
  productName: string;
  variationInfo: string;
  quantity: number;
  unitPrice: number;
  availableStock: number;
  imageUrl?: string | null;
}

interface ProductsFloatingCartProps {
  items: FloatingCartItem[];
  onUpdateQuantity: (variationId: string, delta: number) => void;
  onRemoveItem: (variationId: string) => void;
  onClearCart: () => void;
  onCheckout: (mode: 'sale' | 'reservation') => void;
}

export const ProductsFloatingCart = ({
  items,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
  onCheckout
}: ProductsFloatingCartProps) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalValue = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);

  return (
    <>
      {/* Botão flutuante do carrinho - sempre visível */}
      <div className="fixed bottom-6 right-6 z-50">
        {!isExpanded && (
          <Button
            size="lg"
            className={cn(
              "rounded-full h-16 w-16 shadow-lg transition-all",
              totalItems > 0 ? "animate-pulse bg-primary hover:bg-primary/90" : "bg-muted hover:bg-muted/90 text-muted-foreground"
            )}
            onClick={() => setIsExpanded(true)}
          >
            <ShoppingCart className="h-6 w-6" />
            {totalItems > 0 && (
              <Badge 
                className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0 flex items-center justify-center"
                variant="destructive"
              >
                {totalItems}
              </Badge>
            )}
          </Button>
        )}
      </div>

      {/* Painel expandido do carrinho */}
      {isExpanded && (
        <div className="fixed bottom-6 right-6 z-50 w-96 max-w-[calc(100vw-3rem)] animate-scale-in">
          <Card className="shadow-2xl border-2">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5" />
                  Carrinho
                  {totalItems > 0 && (
                    <Badge variant="secondary">{totalItems} itens</Badge>
                  )}
                </CardTitle>
                <div className="flex gap-1">
                  {items.length > 0 && (
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={onClearCart}
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      Limpar
                    </Button>
                  )}
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => setIsExpanded(false)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="p-0">
              {items.length === 0 ? (
                <div className="p-8 text-center">
                  <ShoppingBag className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                  <p className="text-muted-foreground font-medium mb-1">Carrinho vazio</p>
                  <p className="text-sm text-muted-foreground">
                    Clique em "Adicionar ao Carrinho" nos produtos para começar
                  </p>
                </div>
              ) : (
                <>
                  <ScrollArea className="h-64 px-4">
                    <div className="space-y-3 py-2">
                      {items.map((item) => (
                        <div 
                          key={item.variationId}
                          className="flex gap-3 p-2 rounded-lg bg-muted/50"
                        >
                          {/* Imagem do produto */}
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

                          {/* Info do produto */}
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm line-clamp-1">{item.productName}</p>
                            {item.variationInfo && (
                              <p className="text-xs text-muted-foreground">{item.variationInfo}</p>
                            )}
                            <p className="text-sm font-semibold text-primary">
                              R$ {(item.unitPrice * item.quantity).toFixed(2)}
                            </p>
                          </div>

                          {/* Controles de quantidade */}
                          <div className="flex flex-col items-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-destructive hover:text-destructive"
                              onClick={() => onRemoveItem(item.variationId)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => onUpdateQuantity(item.variationId, -1)}
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
                                onClick={() => onUpdateQuantity(item.variationId, 1)}
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

                  {/* Footer com total e ações */}
                  <div className="p-4 space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Total:</span>
                      <span className="text-2xl font-bold text-primary">
                        R$ {totalValue.toFixed(2)}
                      </span>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button 
                        className="flex-1"
                        onClick={() => onCheckout('sale')}
                      >
                        <ShoppingBag className="h-4 w-4 mr-2" />
                        Vender
                      </Button>
                      <Button 
                        variant="outline"
                        className="flex-1"
                        onClick={() => onCheckout('reservation')}
                      >
                        <PackageCheck className="h-4 w-4 mr-2" />
                        Reservar
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
};
