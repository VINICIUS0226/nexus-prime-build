import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useCart } from '@/contexts/CartContext';
import { ProductCardGallery } from '@/components/ProductCardGallery';
import { ShoppingCart } from 'lucide-react';

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
  selling_price: number | null;
  image_url: string | null;
  product_variations?: ProductVariation[];
  product_images?: ProductImage[];
}

const ClientCatalogDetails = () => {
  const { id } = useParams();
  const { toast } = useToast();
  const { addItems } = useCart();

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sizeFilter, setSizeFilter] = useState('all');
  const [colorFilter, setColorFilter] = useState('all');

  useEffect(() => {
    const fetchCatalogProducts = async () => {
      if (!id) return;
      setLoading(true);
      try {
        // Busca simples de produtos com variações/imagens;
        // assume que a filtragem específica do catálogo será feita por campos no futuro (filters JSON).
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
        setProducts(data || []);
      } catch (error: any) {
        console.error('Erro ao carregar produtos do catálogo:', error);
        toast({
          title: 'Erro ao carregar catálogo',
          description: error.message,
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    fetchCatalogProducts();
  }, [id, toast]);

  const uniqueCategories = useMemo(
    () =>
      Array.from(new Set(products.map((p) => p.category).filter(Boolean))) as string[],
    [products]
  );

  const uniqueSizes = useMemo(
    () =>
      Array.from(
        new Set(
          products.flatMap(
            (p) => p.product_variations?.map((v) => v.size).filter(Boolean) || []
          )
        )
      ) as string[],
    [products]
  );

  const uniqueColors = useMemo(
    () =>
      Array.from(
        new Set(
          products.flatMap(
            (p) => p.product_variations?.map((v) => v.color).filter(Boolean) || []
          )
        )
      ) as string[],
    [products]
  );

  const filteredProducts = useMemo(
    () =>
      products.filter((product) => {
        const matchesSearch =
          product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          product.category?.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesCategory =
          categoryFilter === 'all' || product.category === categoryFilter;

        const matchesSize =
          sizeFilter === 'all' ||
          product.product_variations?.some((v) => v.size === sizeFilter);

        const matchesColor =
          colorFilter === 'all' ||
          product.product_variations?.some((v) => v.color === colorFilter);

        return matchesSearch && matchesCategory && matchesSize && matchesColor;
      }),
    [products, searchTerm, categoryFilter, sizeFilter, colorFilter]
  );

  const getProductImage = (product: Product): string | null => {
    if (product.product_images && product.product_images.length > 0) {
      const primary = product.product_images.find((img) => img.is_primary);
      return primary?.image_url || product.product_images[0].image_url;
    }
    return product.image_url;
  };

  const handleAddToCart = (product: Product) => {
    if (!product.product_variations || product.product_variations.length === 0) {
      toast({
        title: 'Produto indisponível',
        description: 'Este produto não possui variações cadastradas.',
        variant: 'destructive',
      });
      return;
    }

    const items = product.product_variations
      .filter((v) => v.stock_quantity - v.reserved_quantity > 0)
      .map((variation) => ({
        variationId: variation.id,
        productId: product.id,
        productName: product.name,
        variationInfo: [variation.size, variation.color]
          .filter(Boolean)
          .join(' / '),
        quantity: 1,
        unitPrice: variation.selling_price ?? product.selling_price ?? 0,
        availableStock: variation.stock_quantity - variation.reserved_quantity,
        imageUrl: getProductImage(product),
      }));

    if (items.length === 0) {
      toast({
        title: 'Sem estoque',
        description: 'Não há estoque disponível para este produto.',
        variant: 'destructive',
      });
      return;
    }

    addItems(items);
    toast({
      title: 'Produto adicionado',
      description: 'Os itens foram adicionados ao seu carrinho.',
    });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Catálogo de Produtos</h1>
          <p className="text-muted-foreground mt-2">
            Veja e selecione os produtos deste catálogo. Seu carrinho ficará disponível no topo da tela.
          </p>
        </div>

        {/* Barra de busca e filtros */}
        <Card>
          <CardContent className="space-y-4 pt-6">
            <div className="relative">
              <Input
                placeholder="Buscar por nome ou categoria..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-3"
              />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
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
                    {uniqueSizes.map((size) => (
                      <SelectItem key={size} value={size}>
                        {size}
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
                    {uniqueColors.map((color) => (
                      <SelectItem key={color} value={color}>
                        {color}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Grid de produtos */}
        {loading ? (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              Carregando produtos...
            </CardContent>
          </Card>
        ) : filteredProducts.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              Nenhum produto encontrado para este catálogo.
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredProducts.map((product) => {
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
                    <ProductCardGallery
                      images={product.product_images || []}
                      fallbackUrl={product.image_url}
                      productName={product.name}
                    >
                      {product.category && (
                        <Badge
                          variant="secondary"
                          className="absolute bottom-2 left-2"
                        >
                          {product.category}
                        </Badge>
                      )}
                    </ProductCardGallery>
                    <div className="p-4 flex flex-col flex-1">
                      <div className="mb-3">
                        <h3 className="font-bold text-lg line-clamp-2">
                          {product.name}
                        </h3>
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
                        <Button
                          size="sm"
                          className="gap-2"
                          onClick={() => handleAddToCart(product)}
                        >
                          <ShoppingCart className="h-4 w-4" />
                          Adicionar
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default ClientCatalogDetails;

