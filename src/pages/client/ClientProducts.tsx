import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ClientLayout } from '@/components/ClientLayout';
import { ProductCardGallery } from '@/components/ProductCardGallery';
import { supabase } from '@/integrations/supabase/client';
import { useCart } from '@/contexts/CartContext';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { ShoppingCart, ShoppingBag, Package, AlertCircle } from 'lucide-react';

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

interface ProductImage {
  id: string;
  image_url: string;
  is_primary: boolean;
  display_order: number;
  alt_text: string | null;
}

interface Product {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  created_at?: string;
  selling_price: number | null;
  image_url: string | null;
  product_variations?: ProductVariation[];
  product_images?: ProductImage[];
}

type AddDialogState = {
  open: boolean;
  product: Product | null;
  variationId: string | null;
};

const ClientProducts = () => {
  const { user } = useAuth();
  const { addItems } = useCart();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sizeFilter, setSizeFilter] = useState<string>('all');
  const [colorFilter, setColorFilter] = useState<string>('all');
  const [sortOption, setSortOption] = useState<
    'best_sellers' | 'relevantes' | 'novidades' | 'price_asc' | 'price_desc'
  >('relevantes');

  const [reviewStats, setReviewStats] = useState<
    Record<string, { avg: number; count: number }>
  >({});

  const normalizeImageUrl = (value: string | null | undefined): string | null => {
    if (!value) return null;
    // Se já for URL completa, usamos direto.
    if (value.startsWith('http://') || value.startsWith('https://')) return value;

    const extractPathFromPublicUrl = (maybePath: string) => {
      const candidate = maybePath.startsWith('/') ? maybePath : `/${maybePath}`;
      try {
        const u = new URL(candidate, 'http://dummy');
        const parts = u.pathname.split('/').filter(Boolean);
        const idx = parts.findIndex((p) => p === 'product-images');
        if (idx >= 0) return parts.slice(idx + 1).join('/');
        return u.pathname.replace(/^\/+/, '');
      } catch {
        const cleaned = maybePath.replace(/^\/+/, '').replace(/^product-images[\\/]/, '');
        return cleaned;
      }
    };

    const filePath = extractPathFromPublicUrl(value);
    const { data } = supabase.storage.from('product-images').getPublicUrl(filePath);
    return data?.publicUrl || value;
  };

  const [dialog, setDialog] = useState<AddDialogState>({
    open: false,
    product: null,
    variationId: null,
  });

  const uniqueCategories = useMemo(
    () =>
      Array.from(new Set(products.map((p) => p.category).filter(Boolean))) as string[],
    [products]
  );

  const uniqueSizes = useMemo(() => {
    const sizes = new Set<string>();
    for (const p of products) {
      for (const v of p.product_variations || []) {
        const available = v.stock_quantity - v.reserved_quantity;
        if (available > 0 && v.size) sizes.add(v.size);
      }
    }
    return Array.from(sizes);
  }, [products]);

  const uniqueColors = useMemo(() => {
    const colors = new Set<string>();
    for (const p of products) {
      for (const v of p.product_variations || []) {
        const available = v.stock_quantity - v.reserved_quantity;
        if (available > 0 && v.color) colors.add(v.color);
      }
    }
    return Array.from(colors);
  }, [products]);

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('products')
          .select(`
            *,
            product_variations (
              id, sku, size, color, stock_quantity, reserved_quantity, selling_price, cost_price
            ),
            product_images (
              id, image_url, is_primary, display_order, alt_text
            )
          `)
          .order('created_at', { ascending: false });

        if (error) throw error;

        const productsData = (data || []) as Product[];

        const normalizedProducts = productsData.map((p) => ({
          ...p,
          image_url: normalizeImageUrl(p.image_url),
          product_images: (p.product_images || []).map((img) => ({
            ...img,
            image_url: normalizeImageUrl(img.image_url) ?? img.image_url,
          })),
        }));

        setProducts(normalizedProducts);

        const productIds = normalizedProducts.map((p) => p.id);
        if (productIds.length > 0) {
          const { data: reviewRows, error: reviewErr } = await supabase
            .from('product_reviews')
            .select('product_id, rating')
            .in('product_id', productIds);

          if (!reviewErr && reviewRows) {
            const map: Record<string, { avg: number; count: number }> = {};
            for (const row of reviewRows as Array<{ product_id: string; rating: number }>) {
              const cur = map[row.product_id] || { avg: 0, count: 0 };
              const nextCount = cur.count + 1;
              const nextAvg = (cur.avg * cur.count + row.rating) / nextCount;
              map[row.product_id] = { avg: nextAvg, count: nextCount };
            }
            setReviewStats(map);
          }
        }
      } catch (err: unknown) {
        console.error('Erro ao carregar produtos:', err);
        toast({
          title: 'Erro ao carregar produtos',
          description: err instanceof Error ? err.message : 'Tente novamente.',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [toast]);

  const filteredProducts = useMemo(() => {
    const st = searchTerm.trim().toLowerCase();
    return products.filter((product) => {
      const matchesSearch =
        !st ||
        product.name.toLowerCase().includes(st) ||
        (product.description?.toLowerCase().includes(st) ?? false) ||
        (product.category?.toLowerCase().includes(st) ?? false);
      const matchesCategory = categoryFilter === 'all' || product.category === categoryFilter;
      const matchesSize =
        sizeFilter === 'all' ||
        (product.product_variations || []).some(
          (v) => v.size === sizeFilter && v.stock_quantity - v.reserved_quantity > 0
        );
      const matchesColor =
        colorFilter === 'all' ||
        (product.product_variations || []).some(
          (v) => v.color === colorFilter && v.stock_quantity - v.reserved_quantity > 0
        );

      const hasStock = (product.product_variations || []).some(
        (v) => v.stock_quantity - v.reserved_quantity > 0
      );

      return matchesSearch && matchesCategory && matchesSize && matchesColor && hasStock;
    });
  }, [products, searchTerm, categoryFilter, sizeFilter, colorFilter]);

  const sortedProducts = useMemo(() => {
    const getEffectivePrice = (p: Product) =>
      Number(
        p.selling_price ??
          p.product_variations?.find((v) => v.stock_quantity - v.reserved_quantity > 0)?.selling_price ??
          p.product_variations?.[0]?.selling_price ??
          0
      );

    const copy = [...filteredProducts];
    copy.sort((a, b) => {
      if (sortOption === 'novidades') {
        const aTs = a.created_at ? new Date(a.created_at).getTime() : 0;
        const bTs = b.created_at ? new Date(b.created_at).getTime() : 0;
        return bTs - aTs;
      }

      if (sortOption === 'price_asc') return getEffectivePrice(a) - getEffectivePrice(b);
      if (sortOption === 'price_desc') return getEffectivePrice(b) - getEffectivePrice(a);

      const aStats = reviewStats[a.id] || { avg: 0, count: 0 };
      const bStats = reviewStats[b.id] || { avg: 0, count: 0 };

      if (sortOption === 'best_sellers') return bStats.count - aStats.count;
      // relevantes
      if (sortOption === 'relevantes') {
        if (bStats.avg !== aStats.avg) return bStats.avg - aStats.avg;
        return bStats.count - aStats.count;
      }

      return 0;
    });

    return copy;
  }, [filteredProducts, sortOption, reviewStats]);

  const getProductImage = (product: Product): string | null => {
    const images = product.product_images || [];
    if (images.length === 0) return product.image_url;
    const primary = images.find((img) => img.is_primary);
    return primary?.image_url || images[0].image_url;
  };

  const getVariationLabel = (v: ProductVariation) => {
    const size = v.size || '-';
    const color = v.color || '-';
    const availableStock = v.stock_quantity - v.reserved_quantity;
    return `${size} / ${color} (Estoque: ${availableStock})`;
  };

  const availableVariationsFor = (product: Product) =>
    (product.product_variations || []).filter(
      (v) => v.stock_quantity - v.reserved_quantity > 0
    );

  const handleOpenAddDialog = (product: Product) => {
    if (!user) {
      toast({
        title: 'Faça login para comprar',
        description: 'Acesse sua conta para adicionar itens ao carrinho.',
        variant: 'destructive',
      });
      return;
    }

    const available = availableVariationsFor(product);
    if (available.length === 0) {
      toast({
        title: 'Produto indisponível',
        description: 'Não existe variação com estoque disponível.',
        variant: 'destructive',
      });
      return;
    }

    setDialog({
      open: true,
      product,
      variationId: available[0].id,
    });
  };

  const handleConfirmAdd = () => {
    if (!dialog.product || !dialog.variationId) return;

    const variation = (dialog.product.product_variations || []).find((v) => v.id === dialog.variationId);
    if (!variation) return;

    const availableStock = variation.stock_quantity - variation.reserved_quantity;
    if (availableStock <= 0) {
      toast({
        title: 'Sem estoque',
        description: 'Esse tamanho/cor ficou sem estoque. Selecione outra variação.',
        variant: 'destructive',
      });
      return;
    }

    addItems([
      {
        variationId: variation.id,
        productId: dialog.product.id,
        productName: dialog.product.name,
        variationInfo: [variation.size, variation.color].filter(Boolean).join(' / '),
        quantity: 1,
        unitPrice: variation.selling_price ?? dialog.product.selling_price ?? 0,
        availableStock,
        imageUrl: getProductImage(dialog.product),
      },
    ]);

    toast({
      title: 'Item adicionado ao carrinho',
      description: 'Você pode finalizar o pedido em “Carrinho” (topo).',
    });

    setDialog({ open: false, product: null, variationId: null });
  };

  return (
    <ClientLayout>
      <div className="space-y-6 w-full max-w-6xl mx-auto">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Produtos da loja</h1>
          <p className="text-muted-foreground mt-2">
            Selecione um produto e informe o tamanho/cor disponível para adicionar ao carrinho.
          </p>
        </div>

        <Card>
          <CardContent className="space-y-4 pt-6">
            <div className="relative">
              <Input
                placeholder="Buscar por nome, categoria..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-3"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-6 gap-4 items-end">
              <div className="space-y-1">
                <Label className="text-xs">Categoria</Label>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    {uniqueCategories.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Tamanho</Label>
                <Select value={sizeFilter} onValueChange={setSizeFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {uniqueSizes.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Cor</Label>
                <Select value={colorFilter} onValueChange={setColorFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    {uniqueColors.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Ordenar</Label>
                <Select
                  value={sortOption}
                  onValueChange={(v) =>
                    setSortOption(
                      v as 'best_sellers' | 'relevantes' | 'novidades' | 'price_asc' | 'price_desc'
                    )
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Relevantes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="best_sellers">Mais vendidos</SelectItem>
                    <SelectItem value="relevantes">Relevantes</SelectItem>
                    <SelectItem value="novidades">Novidades</SelectItem>
                    <SelectItem value="price_asc">Preço: menor</SelectItem>
                    <SelectItem value="price_desc">Preço: maior</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="text-xs text-muted-foreground md:col-span-2">
                Mostrando apenas produtos com variação disponível.
              </div>
            </div>
          </CardContent>
        </Card>

        {loading ? (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              Carregando produtos...
            </CardContent>
          </Card>
        ) : sortedProducts.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              Nenhum produto encontrado.
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {sortedProducts.map((product) => {
              const available = availableVariationsFor(product);
              const price =
                product.selling_price ??
                product.product_variations?.[0]?.selling_price ??
                null;

              return (
                <Card
                  key={product.id}
                  className="hover:shadow-elegant transition-all hover:-translate-y-1 overflow-hidden flex flex-col"
                >
                  <CardContent className="p-0 flex flex-col h-full">
                    <div className="relative">
                      <ProductCardGallery
                        images={product.product_images || []}
                        fallbackUrl={product.image_url}
                        productName={product.name}
                        onClick={() => navigate(`/client/products/${product.id}`)}
                      >
                        {product.category && (
                          <Badge variant="secondary" className="absolute bottom-2 left-2">
                            {product.category}
                          </Badge>
                        )}
                        {available.length === 0 && (
                          <Badge variant="destructive" className="absolute top-2 right-2">
                            Sem estoque
                          </Badge>
                        )}
                      </ProductCardGallery>
                    </div>

                    <div className="p-4 flex flex-col flex-1">
                      <div className="mb-3">
                        <h3 className="font-bold text-lg line-clamp-2">{product.name}</h3>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {product.description || '\u00A0'}
                        </p>
                      </div>

                      <div className="mt-auto flex items-center justify-between gap-2">
                        <div>
                          <p className="text-xl font-bold text-primary">
                            {price ? `R$ ${price.toFixed(2)}` : 'Sob consulta'}
                          </p>
                        </div>

                        {available.length > 0 ? (
                          <Button
                            size="sm"
                            className="gap-2"
                            onClick={() => handleOpenAddDialog(product)}
                          >
                            <ShoppingCart className="h-4 w-4" />
                            Adicionar
                          </Button>
                        ) : (
                          <Button size="sm" variant="outline" className="gap-2" disabled>
                            <Package className="h-4 w-4" />
                            Indisponível
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Dialog de seleção de variação */}
        <Dialog
          open={dialog.open}
          onOpenChange={(open) => setDialog((prev) => ({ ...prev, open, product: open ? prev.product : null }))}
        >
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Adicionar ao carrinho</DialogTitle>
            </DialogHeader>

            {dialog.product ? (
              <div className="space-y-4">
                <div className="space-y-1">
                  <p className="text-sm font-semibold">{dialog.product.name}</p>
                  <p className="text-xs text-muted-foreground">
                    Selecione o tamanho/cor disponível para este produto.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs">Variação</Label>
                  <Select
                    value={dialog.variationId || undefined}
                    onValueChange={(v) => setDialog((prev) => ({ ...prev, variationId: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      {availableVariationsFor(dialog.product).map((v) => (
                        <SelectItem key={v.id} value={v.id}>
                          {getVariationLabel(v)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="rounded-lg border bg-muted/30 p-3 text-sm">
                  <p className="font-medium flex items-center gap-2">
                    <ShoppingBag className="h-4 w-4 text-primary" />
                    Ao confirmar, adicionamos 1 unidade ao carrinho.
                  </p>
                </div>

                {(() => {
                  const v = (dialog.product?.product_variations || []).find((x) => x.id === dialog.variationId) || null;
                  const availableStock = v ? v.stock_quantity - v.reserved_quantity : 0;
                  if (!v) {
                    return (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <AlertCircle className="h-4 w-4" />
                        Selecione uma variação válida.
                      </div>
                    );
                  }

                  return (
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-muted-foreground">
                        Estoque disponível: <span className="font-semibold text-foreground">{availableStock}</span>
                      </p>
                      <Button
                        onClick={handleConfirmAdd}
                        className="bg-primary text-primary-foreground hover:bg-primary/90"
                        disabled={availableStock <= 0}
                      >
                        Confirmar
                      </Button>
                    </div>
                  );
                })()}
              </div>
            ) : (
              <div className="p-4 text-sm text-muted-foreground">Produto não encontrado.</div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </ClientLayout>
  );
};

export default ClientProducts;

