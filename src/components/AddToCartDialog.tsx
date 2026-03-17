import { useState } from 'react';
import { Plus, Minus, ShoppingCart, Package } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ProductVariation {
  id: string;
  sku: string;
  size: string | null;
  color: string | null;
  stock_quantity: number;
  reserved_quantity: number;
  selling_price: number | null;
  cost_price: number | null;
}

interface Product {
  id: string;
  name: string;
  selling_price: number | null;
  image_url: string | null;
  product_variations?: ProductVariation[];
  product_images?: Array<{
    id: string;
    image_url: string;
    is_primary: boolean;
  }>;
}

interface SelectedVariation {
  variationId: string;
  quantity: number;
}

interface AddToCartDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: Product | null;
  onAddToCart: (items: Array<{
    variationId: string;
    productId: string;
    productName: string;
    variationInfo: string;
    quantity: number;
    unitPrice: number;
    availableStock: number;
    imageUrl: string | null;
  }>) => void;
}

export const AddToCartDialog = ({
  open,
  onOpenChange,
  product,
  onAddToCart
}: AddToCartDialogProps) => {
  const [selections, setSelections] = useState<SelectedVariation[]>([]);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);

  const getProductImage = (): string | null => {
    if (product?.product_images && product.product_images.length > 0) {
      const primary = product.product_images.find(img => img.is_primary);
      return primary?.image_url || product.product_images[0].image_url;
    }
    return product?.image_url || null;
  };

  const getAvailableStock = (variation: ProductVariation) => {
    return variation.stock_quantity - variation.reserved_quantity;
  };

  const getSelectedQuantity = (variationId: string) => {
    return selections.find(s => s.variationId === variationId)?.quantity || 0;
  };

  const updateSelection = (variationId: string, delta: number, maxStock: number) => {
    setSelections(prev => {
      const existing = prev.find(s => s.variationId === variationId);
      if (existing) {
        const newQty = existing.quantity + delta;
        if (newQty <= 0) {
          return prev.filter(s => s.variationId !== variationId);
        }
        if (newQty > maxStock) return prev;
        return prev.map(s => 
          s.variationId === variationId ? { ...s, quantity: newQty } : s
        );
      } else if (delta > 0) {
        return [...prev, { variationId, quantity: 1 }];
      }
      return prev;
    });
  };

  const handleAddToCart = () => {
    if (!product || selections.length === 0) return;

    const items = selections.map(sel => {
      const variation = product.product_variations?.find(v => v.id === sel.variationId);
      if (!variation) return null;

      const variationInfo = [variation.size, variation.color].filter(Boolean).join(' / ');
      const unitPrice = variation.selling_price ?? product.selling_price ?? 0;
      
      return {
        variationId: sel.variationId,
        productId: product.id,
        productName: product.name,
        variationInfo,
        quantity: sel.quantity,
        unitPrice,
        availableStock: getAvailableStock(variation),
        imageUrl: getProductImage()
      };
    }).filter(Boolean) as any[];

    onAddToCart(items);
    setSelections([]);
    setSelectedColor(null);
    setSelectedSize(null);
    onOpenChange(false);
  };

  const totalSelected = selections.reduce((sum, s) => sum + s.quantity, 0);

  // Extract unique sizes and colors disponíveis nas variações
  const uniqueSizes = Array.from(new Set(
    product?.product_variations?.map(v => v.size).filter(Boolean) || []
  )) as string[];

  const uniqueColors = Array.from(new Set(
    product?.product_variations?.map(v => v.color).filter(Boolean) || []
  )) as string[];

  // Filtra variações pela combinação de tamanho/cor selecionados
  const filteredVariations = product?.product_variations?.filter(v => {
    if (selectedColor && v.color !== selectedColor) return false;
    if (selectedSize && v.size !== selectedSize) return false;
    return true;
  }) || [];

  if (!product) return null;

  return (
    <Dialog open={open} onOpenChange={(open) => {
      if (!open) {
        setSelections([]);
        setSelectedColor(null);
        setSelectedSize(null);
      }
      onOpenChange(open);
    }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Adicionar ao Carrinho
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Info do produto */}
          <div className="flex gap-3">
            {getProductImage() ? (
              <img 
                src={getProductImage()!} 
                alt={product.name}
                className="w-20 h-20 rounded-lg object-cover"
              />
            ) : (
              <div className="w-20 h-20 rounded-lg bg-muted flex items-center justify-center">
                <Package className="h-8 w-8 text-muted-foreground" />
              </div>
            )}
            <div>
              <h3 className="font-semibold">{product.name}</h3>
              {product.selling_price && (
                <p className="text-sm text-muted-foreground">
                  Preço base: R$ {product.selling_price.toFixed(2)}
                </p>
              )}
            </div>
          </div>

          {/* Filtros de tamanho e cor */}
          {(uniqueSizes.length > 1 || uniqueColors.length > 1) && (
            <div className="space-y-3">
              {uniqueSizes.length > 1 && (
                <div>
                  <p className="text-sm font-medium mb-2">Filtrar por tamanho:</p>
                  <div className="flex flex-wrap gap-2">
                    <Badge 
                      variant={selectedSize === null ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => setSelectedSize(null)}
                    >
                      Todos
                    </Badge>
                    {uniqueSizes.map(size => (
                      <Badge 
                        key={size}
                        variant={selectedSize === size ? "default" : "outline"}
                        className="cursor-pointer"
                        onClick={() => setSelectedSize(size)}
                      >
                        {size}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {uniqueColors.length > 1 && (
                <div>
                  <p className="text-sm font-medium mb-2">Filtrar por cor:</p>
                  <div className="flex flex-wrap gap-2">
                    <Badge 
                      variant={selectedColor === null ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => setSelectedColor(null)}
                    >
                      Todas
                    </Badge>
                    {uniqueColors.map(color => (
                      <Badge 
                        key={color}
                        variant={selectedColor === color ? "default" : "outline"}
                        className="cursor-pointer"
                        onClick={() => setSelectedColor(color)}
                      >
                        {color}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Lista de variações */}
          <div>
            <p className="text-sm font-medium mb-2">Selecione as variações:</p>
            <ScrollArea className="h-64">
              <div className="space-y-2">
                {filteredVariations.map(variation => {
                  const available = getAvailableStock(variation);
                  const isOutOfStock = available <= 0;
                  const selectedQty = getSelectedQuantity(variation.id);
                  const variationLabel = [variation.size, variation.color].filter(Boolean).join(' / ') || variation.sku;
                  const variationPrice = variation.selling_price ?? product.selling_price ?? 0;

                  return (
                    <div 
                      key={variation.id}
                      className={`flex items-center justify-between p-3 rounded-lg border ${
                        isOutOfStock ? 'opacity-50 bg-muted' : 'hover:bg-muted/50'
                      }`}
                    >
                      <div>
                        <p className="font-medium">{variationLabel}</p>
                        <p className="text-xs text-muted-foreground">
                          SKU: {variation.sku} • {available} disponíveis
                        </p>
                        <p className="text-sm font-semibold text-primary">
                          R$ {variationPrice.toFixed(2)}
                        </p>
                      </div>

                      {isOutOfStock ? (
                        <Badge variant="destructive">Esgotado</Badge>
                      ) : (
                        <div className="flex items-center gap-2">
                          {selectedQty > 0 ? (
                            <>
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => updateSelection(variation.id, -1, available)}
                              >
                                <Minus className="h-4 w-4" />
                              </Button>
                              <span className="w-8 text-center font-medium">
                                {selectedQty}
                              </span>
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => updateSelection(variation.id, 1, available)}
                                disabled={selectedQty >= available}
                              >
                                <Plus className="h-4 w-4" />
                              </Button>
                            </>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => updateSelection(variation.id, 1, available)}
                            >
                              <Plus className="h-4 w-4 mr-1" />
                              Adicionar
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </div>

          {/* Botão de confirmar */}
          <Button 
            className="w-full" 
            size="lg"
            onClick={handleAddToCart}
            disabled={totalSelected === 0}
          >
            <ShoppingCart className="h-4 w-4 mr-2" />
            Adicionar {totalSelected > 0 ? `(${totalSelected} ${totalSelected === 1 ? 'item' : 'itens'})` : 'ao Carrinho'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
