import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Package, ShoppingCart, TrendingUp, AlertCircle, Star, ChevronLeft, ChevronRight, Image as ImageIcon, MessageSquare, Plus, Minus, Link2, ArrowUpRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ProductImageUpload } from "@/components/ProductImageUpload";
import { ProductEditForm } from "@/components/ProductEditForm";
import { AddToCartDialog } from "@/components/AddToCartDialog";
import { ProductsFloatingCart } from "@/components/ProductsFloatingCart";
import { useCart, CartItem } from "@/contexts/CartContext";

interface ProductVariation {
  id: string;
  sku: string;
  size: string | null;
  color: string | null;
  stock_quantity: number;
  reserved_quantity: number;
  min_stock_level: number | null;
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
  customer: {
    full_name: string;
  };
}

interface Product {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  barcode: string | null;
  cost_price: number | null;
  selling_price: number | null;
  profit_margin: number | null;
  image_url: string | null;
  product_variations: ProductVariation[];
}

interface SaleItem {
  quantity: number;
  unit_price: number;
  sale: {
    created_at: string;
    customer: {
      full_name: string;
    };
  };
  variation: {
    size: string | null;
    color: string | null;
  };
}

const ProductDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { items: cartItems, addItems, updateQuantity, removeItem, clearCart } = useCart();
  const [product, setProduct] = useState<Product | null>(null);
  const [productImages, setProductImages] = useState<ProductImage[]>([]);
  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [salesHistory, setSalesHistory] = useState<SaleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [addToCartDialogOpen, setAddToCartDialogOpen] = useState(false);

  useEffect(() => {
    if (id) {
      fetchProductDetails();
      fetchProductImages();
      fetchReviews();
      fetchSalesHistory();
    }
  }, [id]);

  const fetchProductDetails = async () => {
    try {
      const { data, error } = await supabase
        .from("products")
        .select(`
          *,
          product_variations (*)
        `)
        .eq("id", id)
        .single();

      if (error) throw error;
      setProduct(data);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar produto",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchProductImages = async () => {
    try {
      const { data, error } = await supabase
        .from("product_images")
        .select("*")
        .eq("product_id", id)
        .order("display_order", { ascending: true });

      if (error) throw error;
      setProductImages(data || []);
    } catch (error: any) {
      console.error("Erro ao carregar imagens:", error);
    }
  };

  const fetchReviews = async () => {
    try {
      const { data, error } = await supabase
        .from("product_reviews")
        .select(`
          *,
          customer:customers (full_name)
        `)
        .eq("product_id", id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setReviews(data || []);
    } catch (error: any) {
      console.error("Erro ao carregar avaliações:", error);
    }
  };

  const fetchSalesHistory = async () => {
    try {
      const { data: variations } = await supabase
        .from("product_variations")
        .select("id")
        .eq("product_id", id);

      if (!variations || variations.length === 0) return;

      const variationIds = variations.map(v => v.id);

      const { data: reservationItems } = await supabase
        .from("reservation_items")
        .select(`
          quantity,
          unit_price,
          created_at,
          reservation_id,
          variation:product_variations (
            size,
            color
          )
        `)
        .in("variation_id", variationIds);

      if (!reservationItems || reservationItems.length === 0) {
        setSalesHistory([]);
        return;
      }

      const reservationIds = [...new Set(reservationItems.map(item => item.reservation_id))];

      const { data: sales } = await supabase
        .from("sales")
        .select(`
          id,
          reservation_id,
          created_at,
          customer:customers (
            full_name
          )
        `)
        .in("reservation_id", reservationIds);

      if (!sales) {
        setSalesHistory([]);
        return;
      }

      const salesData = reservationItems
        .map(item => {
          const sale = sales.find(s => s.reservation_id === item.reservation_id);
          if (!sale) return null;
          
          return {
            quantity: item.quantity,
            unit_price: item.unit_price,
            sale: {
              created_at: sale.created_at,
              customer: sale.customer
            },
            variation: item.variation
          };
        })
        .filter((item): item is SaleItem => item !== null)
        .sort((a, b) => 
          new Date(b.sale.created_at).getTime() - new Date(a.sale.created_at).getTime()
        );
      
      setSalesHistory(salesData);
    } catch (error: any) {
      console.error("Erro ao carregar histórico:", error);
    }
  };

  const getTotalStock = () => {
    return product?.product_variations.reduce((sum, v) => sum + v.stock_quantity, 0) || 0;
  };

  const getAvailableStock = () => {
    return product?.product_variations.reduce(
      (sum, v) => sum + (v.stock_quantity - v.reserved_quantity),
      0
    ) || 0;
  };

  const getTotalSales = () => {
    return salesHistory.reduce((sum, item) => sum + item.quantity, 0);
  };

  const getTotalRevenue = () => {
    return salesHistory.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
  };

  const getStockStatus = (variation: ProductVariation) => {
    const available = variation.stock_quantity - variation.reserved_quantity;
    if (available === 0) return { label: "Esgotado", variant: "destructive" as const };
    if (variation.min_stock_level && available <= variation.min_stock_level) {
      return { label: "Estoque baixo", variant: "secondary" as const };
    }
    return { label: "Disponível", variant: "default" as const };
  };

  const getAverageRating = () => {
    if (reviews.length === 0) return 0;
    const sum = reviews.reduce((acc, review) => acc + review.rating, 0);
    return sum / reviews.length;
  };

  const getRatingDistribution = () => {
    const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    reviews.forEach(review => {
      distribution[review.rating as keyof typeof distribution]++;
    });
    return distribution;
  };

  const allImages = () => {
    const images: { url: string; alt: string }[] = [];
    
    productImages.forEach(img => {
      images.push({ url: img.image_url, alt: img.alt_text || product?.name || 'Imagem do produto' });
    });
    
    if (images.length === 0 && product?.image_url) {
      images.push({ url: product.image_url, alt: product.name });
    }
    
    return images;
  };

  const handleAddToCart = (items: CartItem[]) => {
    addItems(items);
    toast({
      title: "Adicionado ao carrinho",
      description: `${items.reduce((s, i) => s + i.quantity, 0)} item(ns) adicionado(s)`,
    });
  };

  const handleCheckout = (mode: 'sale' | 'reservation') => {
    if (cartItems.length === 0) return;
    const cartData = cartItems.map(item => ({
      variationId: item.variationId,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
    }));
    const stateData = { prefilledCart: cartData };
    if (mode === 'sale') {
      navigate('/dashboard/sales', { state: stateData });
    } else {
      navigate('/dashboard/reservations', { state: stateData });
    }
    clearCart();
  };

  const images = allImages();

  const nextImage = () => {
    setSelectedImageIndex((prev) => (prev + 1) % images.length);
  };

  const prevImage = () => {
    setSelectedImageIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  const handleShareProduct = () => {
    const href = typeof window !== "undefined" ? window.location.href : "";

    if (!href) {
      toast({
        title: "Não foi possível gerar o link",
        description: "Tente novamente em instantes.",
        variant: "destructive",
      });
      return;
    }

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(href)
        .then(() => {
          toast({
            title: "Link copiado",
            description: "O link deste produto foi copiado para a área de transferência.",
          });
        })
        .catch(() => {
          toast({
            title: "Não foi possível copiar",
            description: "Copie manualmente o link na barra de endereços.",
            variant: "destructive",
          });
        });
    } else {
      toast({
        title: "Recurso não suportado",
        description: "Copie manualmente o link na barra de endereços.",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (!product) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <AlertCircle className="h-12 w-12 text-muted-foreground" />
          <p className="text-muted-foreground">Produto não encontrado</p>
          <Button onClick={() => navigate("/dashboard/products")}>
            Voltar para Produtos
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const averageRating = getAverageRating();
  const ratingDistribution = getRatingDistribution();

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        {/* RESPONSIVIDADE: flex-col no mobile, mantendo o botão de voltar alinhado com o conteúdo */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/dashboard/products")}
            className="shrink-0 self-start"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-bold break-words">{product.name}</h1>
              {product.category && (
                <Badge variant="secondary" className="shrink-0">{product.category}</Badge>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={handleShareProduct}
                className="h-8 px-2 text-xs font-medium text-primary border-primary/60 hover:bg-primary/10"
                title="Copiar link deste produto para encaminhar"
              >
                <span className="mr-1 hidden sm:inline">Link</span>
                <ArrowUpRight className="h-3 w-3" />
              </Button>
            </div>
            {averageRating > 0 && (
              <div className="flex flex-wrap items-center gap-2 mt-1">
                <div className="flex items-center">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`h-4 w-4 ${
                        star <= averageRating
                          ? "text-yellow-500 fill-yellow-500"
                          : "text-muted-foreground"
                      }`}
                    />
                  ))}
                </div>
                <span className="text-sm text-muted-foreground">
                  {averageRating.toFixed(1)} ({reviews.length} avaliações)
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Main content grid */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Image Gallery */}
          <Card className="overflow-hidden">
            <CardContent className="p-0">
              {images.length > 0 ? (
                <div className="relative">
                  {/* Main Image */}
                  <div className="relative aspect-square bg-muted">
                    <img
                      src={images[selectedImageIndex].url}
                      alt={images[selectedImageIndex].alt}
                      className="w-full h-full object-cover"
                    />
                    
                    {/* Navigation arrows */}
                    {images.length > 1 && (
                      <>
                        <Button
                          variant="secondary"
                          size="icon"
                          className="absolute left-2 top-1/2 -translate-y-1/2 opacity-80 hover:opacity-100"
                          onClick={prevImage}
                        >
                          <ChevronLeft className="h-5 w-5" />
                        </Button>
                        <Button
                          variant="secondary"
                          size="icon"
                          className="absolute right-2 top-1/2 -translate-y-1/2 opacity-80 hover:opacity-100"
                          onClick={nextImage}
                        >
                          <ChevronRight className="h-5 w-5" />
                        </Button>
                      </>
                    )}

                    {/* Image counter */}
                    {images.length > 1 && (
                      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-background/80 backdrop-blur-sm px-3 py-1 rounded-full text-sm">
                        {selectedImageIndex + 1} / {images.length}
                      </div>
                    )}
                  </div>

                  {/* Thumbnails */}
                  {images.length > 1 && (
                    <div className="flex gap-2 p-4 overflow-x-auto">
                      {images.map((img, index) => (
                        <button
                          key={index}
                          onClick={() => setSelectedImageIndex(index)}
                          className={`flex-shrink-0 w-16 h-16 rounded-md overflow-hidden border-2 transition-all ${
                            index === selectedImageIndex
                              ? "border-primary"
                              : "border-transparent hover:border-muted-foreground/50"
                          }`}
                        >
                          <img
                            src={img.url}
                            alt={img.alt}
                            className="w-full h-full object-cover"
                          />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="aspect-square bg-muted flex flex-col items-center justify-center">
                  <ImageIcon className="h-24 w-24 text-muted-foreground/30 mb-4" />
                  <p className="text-muted-foreground">Nenhuma imagem disponível</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Product Info */}
          <div className="space-y-6">
            {/* Price and Stock Card */}
            <Card>
              <CardContent className="p-4 sm:p-6 space-y-4">
                {product.selling_price && (
                  <div>
                    <p className="text-4xl font-bold text-primary">
                      R$ {product.selling_price.toFixed(2)}
                    </p>
                    {product.cost_price && (
                      <p className="text-sm text-muted-foreground mt-1">
                        Custo: R$ {product.cost_price.toFixed(2)} | Margem: {product.profit_margin || 0}%
                      </p>
                    )}
                  </div>
                )}

                <Separator />

                {/* Stock Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Estoque Total</p>
                    <p className="text-2xl font-semibold">{getTotalStock()} un</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Disponível</p>
                    <p className="text-2xl font-semibold text-primary">{getAvailableStock()} un</p>
                  </div>
                </div>

                {/* Available sizes and colors */}
                {product.product_variations.length > 0 && (
                  <>
                    <Separator />
                    <div className="space-y-3">
                      {/* Sizes */}
                      {product.product_variations.some(v => v.size) && (
                        <div>
                          <p className="text-sm font-medium mb-2">Tamanhos disponíveis</p>
                          <div className="flex flex-wrap gap-2">
                            {Array.from(new Set(product.product_variations.map(v => v.size).filter(Boolean))).map(size => {
                              const variation = product.product_variations.find(v => v.size === size);
                              const available = variation ? variation.stock_quantity - variation.reserved_quantity : 0;
                              return (
                                <Badge 
                                  key={size} 
                                  variant={available > 0 ? "outline" : "secondary"}
                                  className={available === 0 ? "opacity-50 line-through" : ""}
                                >
                                  {size}
                                </Badge>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Colors */}
                      {product.product_variations.some(v => v.color) && (
                        <div>
                          <p className="text-sm font-medium mb-2">Cores disponíveis</p>
                          <div className="flex flex-wrap gap-2">
                            {Array.from(new Set(product.product_variations.map(v => v.color).filter(Boolean))).map(color => {
                              const variation = product.product_variations.find(v => v.color === color);
                              const available = variation ? variation.stock_quantity - variation.reserved_quantity : 0;
                              return (
                                <Badge 
                                  key={color} 
                                  variant={available > 0 ? "outline" : "secondary"}
                                  className={available === 0 ? "opacity-50 line-through" : ""}
                                >
                                  {color}
                                </Badge>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                )}

                <Separator />

                {/* Action buttons */}
                {/* RESPONSIVIDADE: Empilha os botões no mobile */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button 
                    className="flex-1 w-full"
                    disabled={getAvailableStock() === 0}
                    onClick={() => setAddToCartDialogOpen(true)}
                  >
                    <ShoppingCart className="h-4 w-4 mr-2 shrink-0" />
                    Adicionar ao Carrinho
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Stats Cards */}
            {/* RESPONSIVIDADE: sm:grid-cols-2 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Vendido</CardTitle>
                  <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{getTotalSales()} un</div>
                  <p className="text-xs text-muted-foreground">
                    {salesHistory.length} vendas
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Receita Total</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    R$ {getTotalRevenue().toFixed(2)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Margem: {product.profit_margin || 0}%
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        {/* Image Upload Section */}
        <ProductImageUpload 
          productId={product.id} 
          images={productImages} 
          onImagesUpdated={fetchProductImages} 
        />

        {/* Product Edit Form */}
        <ProductEditForm 
          product={product} 
          onProductUpdated={fetchProductDetails} 
        />

        {/* Tabs for additional info */}
        <Tabs defaultValue="reviews" className="space-y-4">
          {/* RESPONSIVIDADE: flex-wrap na lista de abas para não estourar em telas pequenas */}
          <TabsList className="flex flex-wrap w-full sm:w-auto h-auto">
            <TabsTrigger value="reviews" className="flex-1 sm:flex-none">
              Avaliações ({reviews.length})
            </TabsTrigger>
            <TabsTrigger value="sales" className="flex-1 sm:flex-none">
              Histórico de Vendas
            </TabsTrigger>
          </TabsList>

          {/* Reviews Tab */}
          <TabsContent value="reviews" className="space-y-4">
            {/* Reviews Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Avaliações dos Clientes
                </CardTitle>
              </CardHeader>
              <CardContent>
                {reviews.length > 0 ? (
                  /* RESPONSIVIDADE: Remove a grid fixa para o resumo de reviews no mobile */
                  <div className="grid gap-6 md:grid-cols-[200px_1fr]">
                    {/* Rating Summary */}
                    <div className="text-center">
                      <div className="text-5xl font-bold text-primary">{averageRating.toFixed(1)}</div>
                      <div className="flex justify-center mt-2">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`h-5 w-5 ${
                              star <= averageRating
                                ? "text-yellow-500 fill-yellow-500"
                                : "text-muted-foreground"
                            }`}
                          />
                        ))}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {reviews.length} avaliações
                      </p>
                    </div>

                    {/* Rating Distribution */}
                    <div className="space-y-2">
                      {[5, 4, 3, 2, 1].map((rating) => {
                        const count = ratingDistribution[rating as keyof typeof ratingDistribution];
                        const percentage = reviews.length > 0 ? (count / reviews.length) * 100 : 0;
                        return (
                          <div key={rating} className="flex items-center gap-2">
                            <span className="w-12 text-sm text-muted-foreground whitespace-nowrap">{rating} estrelas</span>
                            <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-yellow-500 rounded-full transition-all"
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                            <span className="w-8 text-sm text-muted-foreground text-right">{count}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Star className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
                    <p className="text-muted-foreground">Este produto ainda não possui avaliações</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Individual Reviews */}
            {reviews.length > 0 && (
              <div className="space-y-4">
                {reviews.map((review) => (
                  <Card key={review.id}>
                    <CardContent className="p-4">
                      {/* RESPONSIVIDADE: flex-col no cabeçalho do review se precisar */}
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-semibold">{review.customer.full_name}</p>
                            {review.is_verified_purchase && (
                              <Badge variant="secondary" className="text-xs">Compra verificada</Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <div className="flex">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <Star
                                  key={star}
                                  className={`h-4 w-4 ${
                                    star <= review.rating
                                      ? "text-yellow-500 fill-yellow-500"
                                      : "text-muted-foreground"
                                  }`}
                                />
                              ))}
                            </div>
                            <span className="text-sm text-muted-foreground">
                              {new Date(review.created_at).toLocaleDateString("pt-BR")}
                            </span>
                          </div>
                        </div>
                      </div>
                      {review.title && (
                        <p className="font-medium mt-3">{review.title}</p>
                      )}
                      {review.comment && (
                        <p className="text-muted-foreground mt-2">{review.comment}</p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Sales History Tab */}
          <TabsContent value="sales">
            <Card>
              <CardHeader>
                <CardTitle>Histórico de Vendas</CardTitle>
                <CardDescription>
                  Todas as vendas realizadas deste produto
                </CardDescription>
              </CardHeader>
              <CardContent>
                {salesHistory.length > 0 ? (
                  /* RESPONSIVIDADE: Scroll Horizontal na tabela */
                  <div className="overflow-x-auto border rounded-md">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="whitespace-nowrap">Data</TableHead>
                          <TableHead className="whitespace-nowrap">Cliente</TableHead>
                          <TableHead className="whitespace-nowrap">Tamanho</TableHead>
                          <TableHead className="whitespace-nowrap">Cor</TableHead>
                          <TableHead className="whitespace-nowrap text-center">Quantidade</TableHead>
                          <TableHead className="whitespace-nowrap text-right">Valor Unit.</TableHead>
                          <TableHead className="whitespace-nowrap text-right">Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {salesHistory.map((item, index) => (
                          <TableRow key={index}>
                            <TableCell className="whitespace-nowrap">
                              {new Date(item.sale.created_at).toLocaleDateString("pt-BR")}
                            </TableCell>
                            <TableCell className="whitespace-nowrap">{item.sale.customer.full_name}</TableCell>
                            <TableCell>{item.variation.size || "-"}</TableCell>
                            <TableCell>
                              {item.variation.color ? (
                                <Badge variant="outline" className="whitespace-nowrap">{item.variation.color}</Badge>
                              ) : (
                                "-"
                              )}
                            </TableCell>
                            <TableCell className="text-center">{item.quantity}</TableCell>
                            <TableCell className="text-right whitespace-nowrap">R$ {item.unit_price.toFixed(2)}</TableCell>
                            <TableCell className="font-semibold text-right whitespace-nowrap">
                              R$ {(item.quantity * item.unit_price).toFixed(2)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    Nenhuma venda registrada para este produto
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        {/* Add to Cart Dialog */}
        {product && (
          <AddToCartDialog
            open={addToCartDialogOpen}
            onOpenChange={setAddToCartDialogOpen}
            product={{
              ...product,
              product_images: productImages.map(img => ({
                id: img.id,
                image_url: img.image_url,
                is_primary: img.is_primary,
              })),
            }}
            onAddToCart={handleAddToCart}
          />
        )}

        {/* Floating Cart */}
        <ProductsFloatingCart
          items={cartItems}
          onUpdateQuantity={updateQuantity}
          onRemoveItem={removeItem}
          onClearCart={clearCart}
          onCheckout={handleCheckout}
        />
      </div>
    </DashboardLayout>
  );
};

export default ProductDetails;