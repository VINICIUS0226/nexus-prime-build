import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Package, ShoppingCart, TrendingUp, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ProductVariation {
  id: string;
  sku: string;
  size: string | null;
  color: string | null;
  stock_quantity: number;
  reserved_quantity: number;
  min_stock_level: number | null;
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
  const [product, setProduct] = useState<Product | null>(null);
  const [salesHistory, setSalesHistory] = useState<SaleItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchProductDetails();
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

  const fetchSalesHistory = async () => {
    try {
      // First get all product variations for this product
      const { data: variations } = await supabase
        .from("product_variations")
        .select("id")
        .eq("product_id", id);

      if (!variations || variations.length === 0) return;

      const variationIds = variations.map(v => v.id);

      // Then get reservation items for these variations
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

      // Get reservation IDs
      const reservationIds = [...new Set(reservationItems.map(item => item.reservation_id))];

      // Get sales for these reservations
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

      // Combine the data
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

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/dashboard/products")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{product.name}</h1>
            <p className="text-muted-foreground">{product.category || "Sem categoria"}</p>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Estoque Total</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{getTotalStock()} un</div>
              <p className="text-xs text-muted-foreground">
                {getAvailableStock()} disponíveis
              </p>
            </CardContent>
          </Card>

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

        <Tabs defaultValue="details" className="space-y-4">
          <TabsList>
            <TabsTrigger value="details">Detalhes</TabsTrigger>
            <TabsTrigger value="variations">Variações</TabsTrigger>
            <TabsTrigger value="sales">Histórico de Vendas</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Informações do Produto</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {product.image_url && (
                  <img
                    src={product.image_url}
                    alt={product.name}
                    className="w-full max-w-md h-64 object-cover rounded-lg"
                  />
                )}
                <div className="grid gap-2">
                  <div>
                    <span className="font-semibold">Descrição:</span>
                    <p className="text-muted-foreground">{product.description || "Sem descrição"}</p>
                  </div>
                  <div>
                    <span className="font-semibold">Código de Barras:</span>
                    <p className="text-muted-foreground">{product.barcode || "N/A"}</p>
                  </div>
                  <div>
                    <span className="font-semibold">Preço de Custo:</span>
                    <p className="text-muted-foreground">
                      R$ {product.cost_price?.toFixed(2) || "0.00"}
                    </p>
                  </div>
                  <div>
                    <span className="font-semibold">Preço de Venda:</span>
                    <p className="text-muted-foreground">
                      R$ {product.selling_price?.toFixed(2) || "0.00"}
                    </p>
                  </div>
                  <div>
                    <span className="font-semibold">Margem de Lucro:</span>
                    <p className="text-muted-foreground">{product.profit_margin || 0}%</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="variations">
            <Card>
              <CardHeader>
                <CardTitle>Variações de Estoque</CardTitle>
                <CardDescription>
                  Estoque disponível por tamanho e cor
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>SKU</TableHead>
                      <TableHead>Tamanho</TableHead>
                      <TableHead>Cor</TableHead>
                      <TableHead>Estoque</TableHead>
                      <TableHead>Reservado</TableHead>
                      <TableHead>Disponível</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {product.product_variations.map((variation) => {
                      const available = variation.stock_quantity - variation.reserved_quantity;
                      const status = getStockStatus(variation);
                      return (
                        <TableRow key={variation.id}>
                          <TableCell className="font-mono text-sm">
                            {variation.sku}
                          </TableCell>
                          <TableCell>{variation.size || "-"}</TableCell>
                          <TableCell>
                            {variation.color ? (
                              <Badge variant="outline">{variation.color}</Badge>
                            ) : (
                              "-"
                            )}
                          </TableCell>
                          <TableCell>{variation.stock_quantity}</TableCell>
                          <TableCell>{variation.reserved_quantity}</TableCell>
                          <TableCell className="font-semibold">{available}</TableCell>
                          <TableCell>
                            <Badge variant={status.variant}>{status.label}</Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

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
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Data</TableHead>
                        <TableHead>Cliente</TableHead>
                        <TableHead>Tamanho</TableHead>
                        <TableHead>Cor</TableHead>
                        <TableHead>Quantidade</TableHead>
                        <TableHead>Valor Unitário</TableHead>
                        <TableHead>Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {salesHistory.map((item, index) => (
                        <TableRow key={index}>
                          <TableCell>
                            {new Date(item.sale.created_at).toLocaleDateString("pt-BR")}
                          </TableCell>
                          <TableCell>{item.sale.customer.full_name}</TableCell>
                          <TableCell>{item.variation.size || "-"}</TableCell>
                          <TableCell>
                            {item.variation.color ? (
                              <Badge variant="outline">{item.variation.color}</Badge>
                            ) : (
                              "-"
                            )}
                          </TableCell>
                          <TableCell>{item.quantity}</TableCell>
                          <TableCell>R$ {item.unit_price.toFixed(2)}</TableCell>
                          <TableCell className="font-semibold">
                            R$ {(item.quantity * item.unit_price).toFixed(2)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    Nenhuma venda registrada para este produto
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default ProductDetails;
