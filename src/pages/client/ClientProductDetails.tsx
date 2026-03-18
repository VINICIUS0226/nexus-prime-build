import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ClientLayout } from '@/components/ClientLayout';
import { supabase } from '@/integrations/supabase/client';
import { useCart, type CartItem } from '@/contexts/CartContext';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AddToCartDialog } from '@/components/AddToCartDialog';
import { ShoppingCart, Star, Package, Truck, Clock, MapPin, ChevronLeft, ChevronRight } from 'lucide-react';

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

interface ProductReview {
  id: string;
  rating: number;
  title: string | null;
  comment: string | null;
  is_verified_purchase: boolean;
  created_at: string;
}

interface Product {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  selling_price: number | null;
  image_url: string | null;
  product_variations: ProductVariation[];
  product_images: ProductImage[];
}

type FreightConfig = {
  id: string;
  name: string;
  base_value: number;
  calculation_rule: string;
};

const ClientProductDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addItems } = useCart();
  const { toast } = useToast();

  const [product, setProduct] = useState<Product | null>(null);
  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [freightConfigs, setFreightConfigs] = useState<FreightConfig[]>([]);
  const [selectedFreightId, setSelectedFreightId] = useState<string>('none');
  const [zip, setZip] = useState<string>('');

  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [intent, setIntent] = useState<'add' | 'buy'>('add');
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  const normalizeImageUrl = (value: string | null | undefined): string | null => {
    if (!value) return null;
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
        return maybePath.replace(/^\/+/, '').replace(/^product-images[\\/]/, '');
      }
    };

    const filePath = extractPathFromPublicUrl(value);
    const { data } = supabase.storage.from('product-images').getPublicUrl(filePath);
    return data?.publicUrl || value;
  };

  useEffect(() => {
    const fetchDetails = async () => {
      if (!id) return;
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
          .eq('id', id)
          .single();

        if (error) throw error;

        const productData = data as Product;
        const normalizedProduct: Product = {
          ...productData,
          image_url: normalizeImageUrl(productData.image_url),
          product_images: (productData.product_images || []).map((img) => ({
            ...img,
            image_url: normalizeImageUrl(img.image_url) ?? img.image_url,
          })),
        };

        setProduct(normalizedProduct);

        const { data: reviewsData, error: reviewsErr } = await supabase
          .from('product_reviews')
          .select('id, rating, title, comment, is_verified_purchase, created_at')
          .eq('product_id', id)
          .order('created_at', { ascending: false });

        if (reviewsErr) throw reviewsErr;
        setReviews((reviewsData || []) as ProductReview[]);
      } catch (err: unknown) {
        console.error('Erro ao carregar detalhes do produto:', err);
        toast({
          title: 'Erro ao carregar produto',
          description: err instanceof Error ? err.message : 'Tente novamente.',
          variant: 'destructive',
        });
      }
    };

    const fetchFreightConfigs = async () => {
      try {
        const { data, error } = await supabase
          .from('freight_configs')
          .select('id, name, base_value, calculation_rule')
          .eq('is_active', true)
          .order('name');
        if (error) throw error;
        setFreightConfigs((data || []) as FreightConfig[]);
      } catch (err: unknown) {
        // Não bloqueia a página: frete é opcional no portal
        console.warn(
          'Não foi possível carregar frete configs:',
          err instanceof Error ? err.message : err
        );
      }
    };

    fetchDetails();
    fetchFreightConfigs();
  }, [id, toast]);

  useEffect(() => {
    // default freight
    if (freightConfigs.length > 0 && selectedFreightId === 'none') {
      setSelectedFreightId(freightConfigs[0].id);
    }
  }, [freightConfigs, selectedFreightId]);

  useEffect(() => {
    // ao trocar de produto, volta para a primeira imagem
    setSelectedImageIndex(0);
  }, [id]);

  const averageRating = useMemo(() => {
    if (!reviews.length) return 0;
    const sum = reviews.reduce((acc, r) => acc + (r.rating || 0), 0);
    return sum / reviews.length;
  }, [reviews]);

  const availableVariations = useMemo(() => {
    if (!product) return [];
    return (product.product_variations || []).filter((v) => v.stock_quantity - v.reserved_quantity > 0);
  }, [product]);

  const sortedImages = useMemo(() => {
    if (!product?.product_images) return [];
    return [...product.product_images].sort((a, b) => {
      if (a.is_primary && !b.is_primary) return -1;
      if (!a.is_primary && b.is_primary) return 1;
      return a.display_order - b.display_order;
    });
  }, [product]);

  const freightValue = useMemo(() => {
    if (selectedFreightId === 'none') return 0;
    const cfg = freightConfigs.find((f) => f.id === selectedFreightId);
    return cfg ? Number(cfg.base_value) : 0;
  }, [freightConfigs, selectedFreightId]);

  const openAddDialog = () => {
    setIntent('add');
    setAddDialogOpen(true);
  };

  const openBuyDialog = () => {
    setIntent('buy');
    setAddDialogOpen(true);
  };

  if (!product) {
    return (
      <ClientLayout>
        <div className="py-12 text-center text-muted-foreground">Carregando produto...</div>
      </ClientLayout>
    );
  }

  const primaryImage = product.product_images?.find((img) => img.is_primary) ?? product.product_images?.[0] ?? null;
  const mainImageUrl = primaryImage?.image_url ?? product.image_url ?? null;

  return (
    <ClientLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row gap-6">
          <div className="flex-1">
            <Card className="overflow-hidden">
              <CardContent className="p-0">
                <div className="relative">
                  <img
                    src={sortedImages[selectedImageIndex]?.image_url ?? mainImageUrl ?? undefined}
                    alt={product.name}
                    className="w-full h-[420px] object-contain bg-muted"
                  />

                  {sortedImages.length > 1 && (
                    <>
                      <button
                        type="button"
                        onClick={() => setSelectedImageIndex((i) => (i === 0 ? sortedImages.length - 1 : i - 1))}
                        className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-background/80 backdrop-blur hover:bg-background"
                        aria-label="Imagem anterior"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedImageIndex((i) => (i === sortedImages.length - 1 ? 0 : i + 1))}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-background/80 backdrop-blur hover:bg-background"
                        aria-label="Próxima imagem"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </>
                  )}

                  {product.category && (
                    <Badge variant="secondary" className="absolute bottom-3 left-3">
                      {product.category}
                    </Badge>
                  )}
                </div>

                {sortedImages.length > 1 && (
                  <div className="p-3 border-t bg-background">
                    <div className="flex gap-2 overflow-x-auto">
                      {sortedImages.map((img, idx) => (
                        <button
                          key={img.id}
                          type="button"
                          onClick={() => setSelectedImageIndex(idx)}
                          className={`rounded-lg overflow-hidden border ${
                            idx === selectedImageIndex ? 'border-primary' : 'border-border'
                          }`}
                          aria-label={`Selecionar imagem ${idx + 1}`}
                        >
                          <img
                            src={img.image_url || mainImageUrl || undefined}
                            alt={`${product.name} - ${idx + 1}`}
                            className="w-20 h-14 object-cover"
                          />
                        </button>
                      ))}
                    </div>
                    <div className="mt-2 text-xs text-muted-foreground">
                      {selectedImageIndex + 1}/{sortedImages.length}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="w-full md:w-[420px] space-y-4">
            <div>
              <h1 className="text-2xl font-bold text-foreground">{product.name}</h1>
              <div className="flex items-center gap-2 mt-2">
                <div className="flex items-center gap-1">
                  {Array.from({ length: 5 }).map((_, idx) => {
                    const filled = averageRating >= idx + 1;
                    return <Star key={idx} className={`h-4 w-4 ${filled ? 'text-primary fill-primary' : 'text-muted-foreground'}`} />;
                  })}
                </div>
                <span className="text-sm text-muted-foreground">
                  {reviews.length ? `${averageRating.toFixed(1)} (${reviews.length} avaliações)` : 'Sem avaliações'}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 p-4 rounded-xl border bg-muted/30">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Preço</p>
                <p className="text-2xl font-bold text-primary">
                  {product.selling_price
                    ? `R$ ${product.selling_price.toFixed(2)}`
                    : availableVariations[0]?.selling_price
                      ? `R$ ${Number(availableVariations[0].selling_price).toFixed(2)}`
                      : 'Sob consulta'}
                </p>
              </div>
              <Badge variant={availableVariations.length ? 'secondary' : 'destructive'}>
                {availableVariations.length ? `${availableVariations.length} variações com estoque` : 'Esgotado'}
              </Badge>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Frete e prazo</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <Label className="text-xs">CEP</Label>
                  <Input
                    value={zip}
                    onChange={(e) => setZip(e.target.value)}
                    placeholder="Ex: 00000-000"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs">Modalidade</Label>
                  <Select value={selectedFreightId} onValueChange={setSelectedFreightId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o frete" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sem frete</SelectItem>
                      {freightConfigs.map((fc) => (
                        <SelectItem key={fc.id} value={fc.id}>
                          {fc.name} - R$ {fc.base_value.toFixed(2)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-start gap-3 text-sm text-muted-foreground">
                  <Truck className="h-4 w-4 text-primary mt-0.5" />
                  <div className="space-y-1">
                    <p>
                      Estimativa do frete: <span className="font-semibold text-foreground">R$ {freightValue.toFixed(2)}</span>
                    </p>
                    <p className="text-xs">Prazo: sob confirmação da loja.</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex flex-col sm:flex-row gap-2">
              <Button
                variant="outline"
                className="flex-1"
                  onClick={openAddDialog}
                disabled={availableVariations.length === 0}
              >
                <ShoppingCart className="h-4 w-4 mr-2" />
                Adicionar
              </Button>

              <Button className="flex-1" onClick={openBuyDialog} disabled={availableVariations.length === 0}>
                Comprar
              </Button>
            </div>

            <div className="text-xs text-muted-foreground">
              Ao comprar, sua solicitação será registrada para processamento e você poderá acompanhar em “Meus pedidos”.
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Sobre o produto</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                {product.description ? product.description : 'Sem descrição cadastrada.'}
              </CardContent>
            </Card>

            <Tabs defaultValue="reviews">
              <TabsList className="w-full justify-start">
                <TabsTrigger value="reviews" className="flex-1 sm:flex-none">
                  Avaliações
                </TabsTrigger>
              </TabsList>

              <TabsContent value="reviews" className="space-y-4">
                <div className="flex items-center gap-2">
                  <Star className="h-4 w-4 text-primary" />
                  <span className="text-sm text-muted-foreground">
                    {reviews.length
                      ? `${averageRating.toFixed(1)} de 5 • ${reviews.length} avaliações`
                      : 'Este produto ainda não possui avaliações.'}
                  </span>
                </div>

                {reviews.length === 0 ? (
                  <div className="rounded-xl border p-4 text-muted-foreground text-sm">
                    Ainda não há avaliações para este produto.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {reviews.map((r) => (
                      <Card key={r.id}>
                        <CardContent className="p-4 space-y-2">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="flex items-center gap-2">
                                <Star className="h-4 w-4 text-primary" />
                                <span className="font-semibold">{r.rating}/5</span>
                                {r.is_verified_purchase && (
                                  <Badge variant="secondary">Compra verificada</Badge>
                                )}
                              </div>
                              <p className="text-sm font-medium mt-1">{r.title || 'Avaliação'}</p>
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {new Date(r.created_at).toLocaleDateString('pt-BR')}
                            </span>
                          </div>

                          <p className="text-xs text-muted-foreground">
                            Cliente verificado: {r.is_verified_purchase ? 'Sim' : 'Não'}
                          </p>

                          {r.comment ? (
                            <p className="text-sm text-muted-foreground">{r.comment}</p>
                          ) : null}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>

          <div className="space-y-3">
            <Card>
              <CardHeader>
                <CardTitle>Pronto para comprar</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <div className="flex items-start gap-2">
                  <Package className="h-4 w-4 text-primary mt-0.5" />
                  <p>
                    Adicione ao carrinho e finalize no topo da tela.
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-primary mt-0.5" />
                  <p>Você pode inserir seu CEP para estimar o frete.</p>
                </div>
                <div className="flex items-start gap-2">
                  <Clock className="h-4 w-4 text-primary mt-0.5" />
                  <p>O prazo final é confirmado pela loja.</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <AddToCartDialog
          open={addDialogOpen}
          onOpenChange={setAddDialogOpen}
          product={{
            id: product.id,
            name: product.name,
            selling_price: product.selling_price,
            image_url: mainImageUrl,
            product_variations: product.product_variations.map((v) => ({
              id: v.id,
              sku: v.sku,
              size: v.size,
              color: v.color,
              stock_quantity: v.stock_quantity,
              reserved_quantity: v.reserved_quantity,
              selling_price: v.selling_price,
              cost_price: v.cost_price,
            })),
            product_images: product.product_images.map((img) => ({
              id: img.id,
              image_url: img.image_url,
              is_primary: img.is_primary,
            })),
          }}
          onAddToCart={(items) => {
            addItems(
              items.map((it) => ({
                ...it,
                imageUrl: it.imageUrl ?? null,
              })) as CartItem[]
            );
            if (intent === 'buy') {
              navigate('/client/checkout', { state: { freightId: selectedFreightId, cep: zip } });
              return;
            }

            toast({
              title: 'Carrinho atualizado',
              description: 'Itens adicionados ao carrinho com sucesso.',
            });
          }}
        />
      </div>
    </ClientLayout>
  );
};

export default ClientProductDetails;

