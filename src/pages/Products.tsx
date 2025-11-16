import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search, Edit, Trash2, Package, Filter, ShoppingCart, AlertCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface ProductVariation {
  id: string;
  sku: string;
  size: string | null;
  color: string | null;
  stock_quantity: number;
  reserved_quantity: number;
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
  product_variations?: ProductVariation[];
}

const Products = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sizeFilter, setSizeFilter] = useState('all');
  const [colorFilter, setColorFilter] = useState('all');
  const [priceRange, setPriceRange] = useState('all');
  const [stockFilter, setStockFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: '',
    barcode: '',
    cost_price: '',
    selling_price: '',
    profit_margin: '',
    image_url: '',
  });

  const [variationData, setVariationData] = useState({
    sku: '',
    size: '',
    color: '',
    stock_quantity: '',
    min_stock_level: '5',
  });

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          product_variations (
            id,
            sku,
            size,
            color,
            stock_quantity,
            reserved_quantity
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProducts(data || []);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar produtos",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!variationData.sku) {
      toast({
        title: "SKU obrigatório",
        description: "Por favor, informe o código SKU da variação",
        variant: "destructive",
      });
      return;
    }

    try {
      // Inserir produto
      const { data: productData, error: productError } = await supabase
        .from('products')
        .insert([{
          name: formData.name,
          description: formData.description || null,
          category: formData.category || null,
          barcode: formData.barcode || null,
          cost_price: formData.cost_price ? parseFloat(formData.cost_price) : null,
          selling_price: formData.selling_price ? parseFloat(formData.selling_price) : null,
          profit_margin: formData.profit_margin ? parseFloat(formData.profit_margin) : null,
          image_url: formData.image_url || null,
        }])
        .select()
        .single();

      if (productError) throw productError;

      // Inserir variação
      const { error: variationError } = await supabase
        .from('product_variations')
        .insert([{
          product_id: productData.id,
          sku: variationData.sku,
          size: variationData.size || null,
          color: variationData.color || null,
          stock_quantity: variationData.stock_quantity ? parseInt(variationData.stock_quantity) : 0,
          min_stock_level: variationData.min_stock_level ? parseInt(variationData.min_stock_level) : 5,
        }]);

      if (variationError) throw variationError;

      toast({
        title: "Produto cadastrado!",
        description: "O produto e sua variação foram adicionados com sucesso.",
      });

      setDialogOpen(false);
      resetForm();
      fetchProducts();
    } catch (error: any) {
      toast({
        title: "Erro ao cadastrar produto",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este produto?')) return;

    try {
      const { error } = await supabase.from('products').delete().eq('id', id);

      if (error) throw error;

      toast({
        title: "Produto excluído",
        description: "O produto foi removido com sucesso.",
      });

      fetchProducts();
    } catch (error: any) {
      toast({
        title: "Erro ao excluir produto",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleEdit = (product: Product) => {
    navigate(`/dashboard/products/${product.id}`);
  };

  const handleSell = (product: Product) => {
    navigate("/dashboard/sales", { state: { selectedProduct: product } });
  };

  const getAvailableStock = (product: Product) => {
    return product.product_variations?.reduce(
      (sum, v) => sum + (v.stock_quantity - v.reserved_quantity),
      0
    ) || 0;
  };

  const getTotalStock = (product: Product) => {
    return product.product_variations?.reduce(
      (sum, v) => sum + v.stock_quantity,
      0
    ) || 0;
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      category: '',
      barcode: '',
      cost_price: '',
      selling_price: '',
      profit_margin: '',
      image_url: '',
    });
    setVariationData({
      sku: '',
      size: '',
      color: '',
      stock_quantity: '',
      min_stock_level: '5',
    });
  };

  // Extrair valores únicos para filtros
  const uniqueCategories = Array.from(new Set(products.map(p => p.category).filter(Boolean))) as string[];
  const uniqueSizes = Array.from(new Set(products.flatMap(p => p.product_variations?.map(v => v.size).filter(Boolean) || []))) as string[];
  const uniqueColors = Array.from(new Set(products.flatMap(p => p.product_variations?.map(v => v.color).filter(Boolean) || []))) as string[];

  const filteredProducts = products.filter(product => {
    // Filtro de busca
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.barcode?.toLowerCase().includes(searchTerm.toLowerCase());

    // Filtro de categoria
    const matchesCategory = categoryFilter === 'all' || product.category === categoryFilter;

    // Filtro de tamanho
    const matchesSize = sizeFilter === 'all' || 
      product.product_variations?.some(v => v.size === sizeFilter);

    // Filtro de cor
    const matchesColor = colorFilter === 'all' || 
      product.product_variations?.some(v => v.color === colorFilter);

    // Filtro de preço
    let matchesPrice = true;
    if (priceRange !== 'all' && product.selling_price) {
      const price = product.selling_price;
      switch (priceRange) {
        case '0-50':
          matchesPrice = price <= 50;
          break;
        case '50-100':
          matchesPrice = price > 50 && price <= 100;
          break;
        case '100-200':
          matchesPrice = price > 100 && price <= 200;
          break;
        case '200+':
          matchesPrice = price > 200;
          break;
      }
    }

    // Filtro de estoque
    let matchesStock = true;
    if (stockFilter !== 'all') {
      const totalStock = product.product_variations?.reduce((sum, v) => sum + (v.stock_quantity - v.reserved_quantity), 0) || 0;
      switch (stockFilter) {
        case 'available':
          matchesStock = totalStock > 0;
          break;
        case 'low':
          matchesStock = totalStock > 0 && totalStock <= 5;
          break;
        case 'out':
          matchesStock = totalStock === 0;
          break;
      }
    }

    return matchesSearch && matchesCategory && matchesSize && matchesColor && matchesPrice && matchesStock;
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold mb-2">Produtos</h1>
            <p className="text-muted-foreground">Gerencie seu catálogo de produtos</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary/90">
                <Plus className="mr-2 h-4 w-4" />
                Novo Produto
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Cadastrar Novo Produto</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="category">Categoria</Label>
                    <Input
                      id="category"
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Descrição</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="barcode">Código de Barras</Label>
                    <Input
                      id="barcode"
                      value={formData.barcode}
                      onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="image_url">URL da Imagem</Label>
                    <Input
                      id="image_url"
                      value={formData.image_url}
                      onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                      placeholder="https://..."
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="cost_price">Preço de Custo (R$)</Label>
                    <Input
                      id="cost_price"
                      type="number"
                      step="0.01"
                      value={formData.cost_price}
                      onChange={(e) => setFormData({ ...formData, cost_price: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="selling_price">Preço de Venda (R$)</Label>
                    <Input
                      id="selling_price"
                      type="number"
                      step="0.01"
                      value={formData.selling_price}
                      onChange={(e) => setFormData({ ...formData, selling_price: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="profit_margin">Margem de Lucro (%)</Label>
                    <Input
                      id="profit_margin"
                      type="number"
                      step="0.01"
                      value={formData.profit_margin}
                      onChange={(e) => setFormData({ ...formData, profit_margin: e.target.value })}
                    />
                  </div>
                </div>
                
                <div className="border-t pt-4 mt-4">
                  <h3 className="text-lg font-semibold mb-4">Variação de Produto</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="sku">Código SKU *</Label>
                      <Input
                        id="sku"
                        value={variationData.sku}
                        onChange={(e) => setVariationData({ ...variationData, sku: e.target.value })}
                        required
                        placeholder="Ex: PQVEN-001-P-AZUL"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="stock_quantity">Quantidade em Estoque</Label>
                      <Input
                        id="stock_quantity"
                        type="number"
                        value={variationData.stock_quantity}
                        onChange={(e) => setVariationData({ ...variationData, stock_quantity: e.target.value })}
                        placeholder="0"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4 mt-4">
                    <div className="space-y-2">
                      <Label htmlFor="size">Tamanho</Label>
                      <Input
                        id="size"
                        value={variationData.size}
                        onChange={(e) => setVariationData({ ...variationData, size: e.target.value })}
                        placeholder="Ex: P, M, G"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="color">Cor</Label>
                      <Input
                        id="color"
                        value={variationData.color}
                        onChange={(e) => setVariationData({ ...variationData, color: e.target.value })}
                        placeholder="Ex: Azul, Vermelho"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="min_stock_level">Estoque Mínimo</Label>
                      <Input
                        id="min_stock_level"
                        type="number"
                        value={variationData.min_stock_level}
                        onChange={(e) => setVariationData({ ...variationData, min_stock_level: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 justify-end">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" className="bg-primary hover:bg-primary/90">
                    Cadastrar
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Barra de busca e filtros */}
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, categoria ou código de barras..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          <Card className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <h3 className="font-semibold">Filtros</h3>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <div className="space-y-2">
                <Label className="text-xs">Categoria</Label>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    {uniqueCategories.map(cat => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs">Tamanho</Label>
                <Select value={sizeFilter} onValueChange={setSizeFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {uniqueSizes.map(size => (
                      <SelectItem key={size} value={size}>{size}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs">Cor</Label>
                <Select value={colorFilter} onValueChange={setColorFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    {uniqueColors.map(color => (
                      <SelectItem key={color} value={color}>{color}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs">Faixa de Preço</Label>
                <Select value={priceRange} onValueChange={setPriceRange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="0-50">Até R$ 50</SelectItem>
                    <SelectItem value="50-100">R$ 50 - R$ 100</SelectItem>
                    <SelectItem value="100-200">R$ 100 - R$ 200</SelectItem>
                    <SelectItem value="200+">Acima de R$ 200</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs">Disponibilidade</Label>
                <Select value={stockFilter} onValueChange={setStockFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="available">Em estoque</SelectItem>
                    <SelectItem value="low">Estoque baixo</SelectItem>
                    <SelectItem value="out">Sem estoque</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </Card>
        </div>

        {/* Grid de produtos */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredProducts.map((product) => {
            const availableStock = getAvailableStock(product);
            const totalStock = getTotalStock(product);
            const isOutOfStock = availableStock === 0;
            const isLowStock = availableStock > 0 && availableStock <= 5;

            return (
              <Card key={product.id} className="hover:shadow-elegant transition-all hover:-translate-y-1 overflow-hidden">
                <CardContent className="p-0">
                  {/* Imagem do produto */}
                  <div className="relative">
                    {product.image_url ? (
                      <img
                        src={product.image_url}
                        alt={product.name}
                        className="w-full h-56 object-cover"
                      />
                    ) : (
                      <div className="w-full h-56 bg-muted flex items-center justify-center">
                        <Package className="h-16 w-16 text-muted-foreground opacity-30" />
                      </div>
                    )}
                    
                    {/* Badge de status de estoque */}
                    {isOutOfStock && (
                      <Badge variant="destructive" className="absolute top-2 right-2">
                        Esgotado
                      </Badge>
                    )}
                    {isLowStock && (
                      <Badge variant="default" className="absolute top-2 right-2 bg-accent text-accent-foreground">
                        Estoque baixo
                      </Badge>
                    )}
                    
                    {/* Categoria badge */}
                    {product.category && (
                      <Badge variant="secondary" className="absolute top-2 left-2">
                        {product.category}
                      </Badge>
                    )}
                  </div>

                  <div className="p-4 space-y-3">
                    {/* Nome e descrição */}
                    <div>
                      <h3 className="font-bold text-lg line-clamp-2 mb-1">{product.name}</h3>
                      {product.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2">{product.description}</p>
                      )}
                    </div>

                    {/* Variações disponíveis */}
                    {product.product_variations && product.product_variations.length > 0 && (
                      <div className="space-y-2">
                        {/* Tamanhos */}
                        {product.product_variations.some(v => v.size) && (
                          <div className="flex flex-wrap gap-1">
                            <span className="text-xs text-muted-foreground">Tamanhos:</span>
                            {Array.from(new Set(product.product_variations.map(v => v.size).filter(Boolean))).map(size => (
                              <Badge key={size} variant="outline" className="text-xs">
                                {size}
                              </Badge>
                            ))}
                          </div>
                        )}
                        
                        {/* Cores */}
                        {product.product_variations.some(v => v.color) && (
                          <div className="flex flex-wrap gap-1">
                            <span className="text-xs text-muted-foreground">Cores:</span>
                            {Array.from(new Set(product.product_variations.map(v => v.color).filter(Boolean))).map(color => (
                              <Badge key={color} variant="outline" className="text-xs">
                                {color}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Preço e estoque */}
                    <div className="flex items-end justify-between">
                      <div>
                        {product.selling_price && (
                          <p className="text-2xl font-bold text-primary">
                            R$ {product.selling_price.toFixed(2)}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Package className="h-3 w-3" />
                          {availableStock}/{totalStock} disponíveis
                        </p>
                      </div>
                    </div>

                    {/* Ações */}
                    <div className="flex gap-2 pt-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex-1"
                        disabled={isOutOfStock}
                        onClick={() => handleSell(product)}
                      >
                        <ShoppingCart className="h-4 w-4 mr-1" />
                        Vender
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleEdit(product)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(product.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {filteredProducts.length === 0 && !loading && (
          <Card>
            <CardContent className="p-12 text-center">
              <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">Nenhum produto encontrado</h3>
              <p className="text-muted-foreground">
                {searchTerm ? 'Tente buscar com outros termos' : 'Comece cadastrando seu primeiro produto'}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Products;
