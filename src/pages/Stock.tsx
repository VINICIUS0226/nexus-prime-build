import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Package, AlertTriangle, Upload } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

interface ProductVariation {
  id: string;
  product_id: string;
  sku: string;
  size: string | null;
  color: string | null;
  stock_quantity: number;
  reserved_quantity: number;
  min_stock_level: number;
  products: {
    name: string;
    image_url: string | null;
  };
}

const Stock = () => {
  const [variations, setVariations] = useState<ProductVariation[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [xmlFile, setXmlFile] = useState<File | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchVariations();
  }, []);

  const fetchVariations = async () => {
    try {
      const { data, error } = await supabase
        .from('product_variations')
        .select(`
          *,
          products (
            name,
            image_url
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setVariations(data || []);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar estoque",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleXmlUpload = async () => {
    if (!xmlFile) {
      toast({
        title: "Nenhum arquivo selecionado",
        description: "Por favor, selecione um arquivo XML",
        variant: "destructive",
      });
      return;
    }

    // TODO: Implementar parser de XML da NF-e
    toast({
      title: "Funcionalidade em desenvolvimento",
      description: "A importação de XML será implementada em breve",
    });
    setDialogOpen(false);
  };

  const filteredVariations = variations.filter(variation =>
    variation.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
    variation.products?.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const isLowStock = (variation: ProductVariation) => {
    return variation.stock_quantity <= variation.min_stock_level;
  };

  const availableStock = (variation: ProductVariation) => {
    return variation.stock_quantity - variation.reserved_quantity;
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold mb-2">Estoque</h1>
            <p className="text-muted-foreground">Gerencie suas variações de produtos</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-primary hover:opacity-90">
                <Upload className="mr-2 h-4 w-4" />
                Importar XML
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Importar Nota Fiscal (XML)</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="xml">Arquivo XML da NF-e</Label>
                  <Input
                    id="xml"
                    type="file"
                    accept=".xml"
                    onChange={(e) => setXmlFile(e.target.files?.[0] || null)}
                  />
                </div>
                <div className="flex gap-2 justify-end">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleXmlUpload} className="bg-gradient-primary hover:opacity-90">
                    Importar
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por SKU ou produto..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredVariations.map((variation) => (
            <Card key={variation.id} className={`hover:shadow-elegant transition-shadow ${isLowStock(variation) ? 'border-destructive' : ''}`}>
              <CardContent className="p-6">
                {variation.products?.image_url && (
                  <img
                    src={variation.products.image_url}
                    alt={variation.products?.name}
                    className="w-full h-48 object-cover rounded-lg mb-4"
                  />
                )}
                <h3 className="text-xl font-bold mb-2">{variation.products?.name}</h3>
                <div className="space-y-2 mb-4">
                  <p className="text-sm">
                    <span className="font-semibold">SKU:</span> {variation.sku}
                  </p>
                  {variation.size && (
                    <p className="text-sm">
                      <span className="font-semibold">Tamanho:</span> {variation.size}
                    </p>
                  )}
                  {variation.color && (
                    <p className="text-sm">
                      <span className="font-semibold">Cor:</span> {variation.color}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Estoque Total:</span>
                    <Badge variant={isLowStock(variation) ? "destructive" : "default"}>
                      {variation.stock_quantity} un.
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Reservado:</span>
                    <Badge variant="secondary">{variation.reserved_quantity} un.</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Disponível:</span>
                    <Badge variant="outline">{availableStock(variation)} un.</Badge>
                  </div>
                </div>
                {isLowStock(variation) && (
                  <div className="mt-4 flex items-center gap-2 text-destructive text-sm">
                    <AlertTriangle className="h-4 w-4" />
                    <span>Estoque baixo!</span>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredVariations.length === 0 && !loading && (
          <Card>
            <CardContent className="p-12 text-center">
              <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">Nenhuma variação encontrada</h3>
              <p className="text-muted-foreground">
                {searchTerm ? 'Tente buscar com outros termos' : 'Cadastre produtos com variações para gerenciar o estoque'}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Stock;
