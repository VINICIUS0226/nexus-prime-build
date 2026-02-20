import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Package, AlertTriangle, Upload, Edit, Filter, Save, Plus } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious, PaginationEllipsis } from '@/components/ui/pagination';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';

interface ProductVariation {
  id: string;
  product_id: string;
  sku: string;
  size: string | null;
  color: string | null;
  stock_quantity: number;
  reserved_quantity: number;
  min_stock_level: number;
  selling_price: number | null;
  cost_price: number | null;
  products: {
    name: string;
    image_url: string | null;
    cost_price: number | null;
    selling_price: number | null;
  };
}

interface Product {
  id: string;
  name: string;
}

const editStockSchema = z.object({
  stock_quantity: z.number().min(0, 'Quantidade não pode ser negativa').int('Deve ser um número inteiro'),
  min_stock_level: z.number().min(0, 'Nível mínimo não pode ser negativo').int('Deve ser um número inteiro'),
  cost_price: z.number().min(0, 'Preço de custo não pode ser negativo'),
  selling_price: z.number().min(0, 'Preço de venda não pode ser negativo'),
});

const addStockSchema = z.object({
  product_id: z.string().optional(),
  new_product_name: z.string().optional(),
  sku: z.string().min(1, 'SKU é obrigatório'),
  color: z.string().optional(),
  size: z.string().optional(),
  stock_quantity: z.number().min(0, 'Quantidade não pode ser negativa').int('Deve ser um número inteiro'),
  min_stock_level: z.number().min(0, 'Nível mínimo não pode ser negativo').int('Deve ser um número inteiro'),
  cost_price: z.number().min(0, 'Preço de custo não pode ser negativo'),
  selling_price: z.number().min(0, 'Preço de venda não pode ser negativo'),
}).refine((data) => data.product_id || data.new_product_name, {
  message: "Selecione um produto existente ou informe um nome para novo produto",
  path: ["product_id"],
});

const Stock = () => {
  const [variations, setVariations] = useState<ProductVariation[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [colorFilter, setColorFilter] = useState('all');
  const [sizeFilter, setSizeFilter] = useState('all');
  const [stockFilter, setStockFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [xmlFile, setXmlFile] = useState<File | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingVariation, setEditingVariation] = useState<ProductVariation | null>(null);
  const [isNewProduct, setIsNewProduct] = useState(false);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof editStockSchema>>({
    resolver: zodResolver(editStockSchema),
    defaultValues: {
      stock_quantity: 0,
      min_stock_level: 5,
      cost_price: 0,
      selling_price: 0,
    },
  });

  const addForm = useForm<z.infer<typeof addStockSchema>>({
    resolver: zodResolver(addStockSchema),
    defaultValues: {
      product_id: '',
      new_product_name: '',
      sku: '',
      color: '',
      size: '',
      stock_quantity: 0,
      min_stock_level: 0,
      cost_price: 0,
      selling_price: 0,
    },
  });

  useEffect(() => {
    fetchVariations();
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('id, name')
        .order('name');
      
      if (error) throw error;
      setProducts(data || []);
    } catch (error: any) {
      console.error('Erro ao carregar produtos:', error.message);
    }
  };

  const fetchVariations = async () => {
    try {
      const { data, error } = await supabase
        .from('product_variations')
        .select(`
          *,
          products (
            name,
            image_url,
            cost_price,
            selling_price
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

  const handleEditClick = (variation: ProductVariation) => {
    setEditingVariation(variation);
    form.reset({
      stock_quantity: variation.stock_quantity,
      min_stock_level: variation.min_stock_level,
      cost_price: variation.products?.cost_price || 0,
      selling_price: variation.products?.selling_price || 0,
    });
    setEditDialogOpen(true);
  };

  const onSubmitEdit = async (values: z.infer<typeof editStockSchema>) => {
    if (!editingVariation) return;

    try {
      setLoading(true);

      // Atualizar variação do produto
      const { error: variationError } = await supabase
        .from('product_variations')
        .update({
          stock_quantity: values.stock_quantity,
          min_stock_level: values.min_stock_level,
        })
        .eq('id', editingVariation.id);

      if (variationError) throw variationError;

      // Atualizar preços do produto
      const { error: productError } = await supabase
        .from('products')
        .update({
          cost_price: values.cost_price,
          selling_price: values.selling_price,
        })
        .eq('id', editingVariation.product_id);

      if (productError) throw productError;

      await fetchVariations();
      setEditDialogOpen(false);
      setEditingVariation(null);

      toast({
        title: "Estoque atualizado",
        description: "As informações foram atualizadas com sucesso",
      });
    } catch (error: any) {
      toast({
        title: "Erro ao atualizar estoque",
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

    try {
      setLoading(true);
      const xmlText = await xmlFile.text();
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlText, "text/xml");

      // Extrair todos os itens (det) da nota fiscal
      const items = xmlDoc.getElementsByTagName('det');
      
      if (items.length === 0) {
        throw new Error("Nenhum item encontrado no XML");
      }

      let importedCount = 0;
      let errorCount = 0;

      for (let i = 0; i < items.length; i++) {
        try {
          const item = items[i];
          
          // Extrair dados do produto
          const cProd = item.getElementsByTagName('cProd')[0]?.textContent || '';
          const cEAN = item.getElementsByTagName('cEAN')[0]?.textContent || '';
          const xProd = item.getElementsByTagName('xProd')[0]?.textContent || '';
          const qCom = parseFloat(item.getElementsByTagName('qCom')[0]?.textContent || '0');
          const vUnCom = parseFloat(item.getElementsByTagName('vUnCom')[0]?.textContent || '0');

          // Parsear descrição do produto (formato: "NOME / COR / TAMANHO")
          const parts = xProd.split('/').map(p => p.trim());
          const productName = parts[0] || xProd;
          const color = parts.length >= 2 ? parts[1] : null;
          const size = parts.length >= 3 ? parts[2] : null;

          // Verificar se o produto já existe pelo código EAN ou SKU
          const { data: existingVariation } = await supabase
            .from('product_variations')
            .select('id, stock_quantity, product_id')
            .eq('sku', cProd)
            .maybeSingle();

          if (existingVariation) {
            // Atualizar estoque existente
            await supabase
              .from('product_variations')
              .update({
                stock_quantity: existingVariation.stock_quantity + qCom
              })
              .eq('id', existingVariation.id);
          } else {
            // Criar novo produto
            const { data: newProduct, error: productError } = await supabase
              .from('products')
              .insert({
                name: productName,
                barcode: cEAN || null,
                cost_price: vUnCom
              })
              .select()
              .single();

            if (productError) throw productError;

            // Criar variação do produto
            await supabase
              .from('product_variations')
              .insert({
                product_id: newProduct.id,
                sku: cProd,
                size: size,
                color: color,
                stock_quantity: qCom,
                reserved_quantity: 0,
                min_stock_level: 5
              });
          }

          importedCount++;
        } catch (itemError: any) {
          console.error(`Erro ao importar item ${i + 1}:`, itemError);
          errorCount++;
        }
      }

      await fetchVariations();
      setDialogOpen(false);
      setXmlFile(null);

      toast({
        title: "Importação concluída",
        description: `${importedCount} produtos importados com sucesso${errorCount > 0 ? `, ${errorCount} com erro` : ''}`,
      });
    } catch (error: any) {
      toast({
        title: "Erro ao importar XML",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const onSubmitAdd = async (values: z.infer<typeof addStockSchema>) => {
    try {
      setLoading(true);

      let productId = values.product_id;

      // Se é um novo produto, criar primeiro
      if (isNewProduct && values.new_product_name) {
        const { data: newProduct, error: productError } = await supabase
          .from('products')
          .insert({
            name: values.new_product_name,
            cost_price: values.cost_price,
            selling_price: values.selling_price,
          })
          .select()
          .single();

        if (productError) throw productError;
        productId = newProduct.id;
      } else if (productId) {
        // Atualizar preços do produto existente
        await supabase
          .from('products')
          .update({
            cost_price: values.cost_price,
            selling_price: values.selling_price,
          })
          .eq('id', productId);
      }

      if (!productId) {
        throw new Error('Produto não selecionado');
      }

      // Verificar se já existe variação com mesmo SKU
      const { data: existingVariation } = await supabase
        .from('product_variations')
        .select('id')
        .eq('sku', values.sku)
        .maybeSingle();

      if (existingVariation) {
        throw new Error('Já existe uma variação com este SKU');
      }

      // Criar variação do produto
      const { error: variationError } = await supabase
        .from('product_variations')
        .insert({
          product_id: productId,
          sku: values.sku,
          color: values.color || null,
          size: values.size || null,
          stock_quantity: values.stock_quantity,
          reserved_quantity: 0,
          min_stock_level: values.min_stock_level,
        });

      if (variationError) throw variationError;

      await fetchVariations();
      await fetchProducts();
      setAddDialogOpen(false);
      addForm.reset();
      setIsNewProduct(false);

      toast({
        title: "Estoque adicionado",
        description: "O item foi cadastrado com sucesso",
      });
    } catch (error: any) {
      toast({
        title: "Erro ao adicionar estoque",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const isLowStock = (variation: ProductVariation) => {
    return variation.stock_quantity <= variation.min_stock_level;
  };

  const availableStock = (variation: ProductVariation) => {
    return variation.stock_quantity - variation.reserved_quantity;
  };

  const filteredVariations = variations.filter(variation => {
    const matchesSearch = variation.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      variation.products?.name.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesColor = colorFilter === 'all' || variation.color === colorFilter;
    const matchesSize = sizeFilter === 'all' || variation.size === sizeFilter;
    
    let matchesStock = true;
    if (stockFilter === 'low') {
      matchesStock = isLowStock(variation);
    } else if (stockFilter === 'normal') {
      matchesStock = !isLowStock(variation);
    }
    
    return matchesSearch && matchesColor && matchesSize && matchesStock;
  });

  const uniqueColors = Array.from(new Set(variations.map(v => v.color).filter(Boolean)));
  const uniqueSizes = Array.from(new Set(variations.map(v => v.size).filter(Boolean)));

  // Paginação
  const totalPages = Math.ceil(filteredVariations.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedVariations = filteredVariations.slice(startIndex, endIndex);

  // Reset para página 1 quando filtros mudarem
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, colorFilter, sizeFilter, stockFilter]);

  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;
    
    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) pages.push(i);
        pages.push('ellipsis');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1);
        pages.push('ellipsis');
        for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i);
      } else {
        pages.push(1);
        pages.push('ellipsis');
        pages.push(currentPage - 1);
        pages.push(currentPage);
        pages.push(currentPage + 1);
        pages.push('ellipsis');
        pages.push(totalPages);
      }
    }
    
    return pages;
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold mb-2">Estoque</h1>
            <p className="text-muted-foreground">Gerencie suas variações de produtos</p>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => {
                addForm.reset();
                setIsNewProduct(false);
                setAddDialogOpen(true);
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              Adicionar Manual
            </Button>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-primary shadow-elegant hover:bg-primary/90">
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
                    <Button onClick={handleXmlUpload} className="bg-primary hover:bg-primary/90">
                      Importar
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <span className="font-semibold">Filtros</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Itens por página:</span>
                <Select value={itemsPerPage.toString()} onValueChange={(value) => setItemsPerPage(Number(value))}>
                  <SelectTrigger className="w-20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="25">25</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por SKU ou produto..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              <Select value={colorFilter} onValueChange={setColorFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filtrar por cor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as cores</SelectItem>
                  {uniqueColors.map(color => (
                    <SelectItem key={color} value={color || ''}>{color}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={sizeFilter} onValueChange={setSizeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filtrar por tamanho" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os tamanhos</SelectItem>
                  {uniqueSizes.map(size => (
                    <SelectItem key={size} value={size || ''}>{size}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={stockFilter} onValueChange={setStockFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Status do estoque" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="low">Estoque baixo</SelectItem>
                  <SelectItem value="normal">Estoque normal</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-primary hover:bg-primary">
                  <TableHead className="text-primary-foreground">Produto</TableHead>
                  <TableHead className="text-primary-foreground">SKU</TableHead>
                  <TableHead className="text-primary-foreground">Cor</TableHead>
                  <TableHead className="text-primary-foreground">Tamanho</TableHead>
                  <TableHead className="text-primary-foreground text-center">Estoque Total</TableHead>
                  <TableHead className="text-primary-foreground text-center">Reservado</TableHead>
                  <TableHead className="text-primary-foreground text-center">Disponível</TableHead>
                  <TableHead className="text-primary-foreground text-center">Status</TableHead>
                  <TableHead className="text-primary-foreground text-center">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedVariations.map((variation) => (
                  <TableRow key={variation.id} className="hover:bg-muted/30">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {variation.products?.image_url && (
                          <img
                            src={variation.products.image_url}
                            alt={variation.products?.name}
                            className="w-12 h-12 object-cover rounded"
                          />
                        )}
                        <span className="font-medium">{variation.products?.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-sm">{variation.sku}</TableCell>
                    <TableCell>
                      {variation.color ? (
                        <Badge variant="outline">{variation.color}</Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {variation.size ? (
                        <Badge variant="outline">{variation.size}</Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={isLowStock(variation) ? "destructive" : "default"}>
                        {variation.stock_quantity}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary">{variation.reserved_quantity}</Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline">{availableStock(variation)}</Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      {isLowStock(variation) ? (
                        <div className="flex items-center justify-center gap-1 text-destructive">
                          <AlertTriangle className="h-4 w-4" />
                          <span className="text-xs font-medium">Baixo</span>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center gap-1 text-success">
                          <Package className="h-4 w-4" />
                          <span className="text-xs font-medium">Normal</span>
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-primary hover:text-primary"
                        onClick={() => handleEditClick(variation)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {paginatedVariations.length === 0 && !loading && filteredVariations.length === 0 && (
              <div className="p-12 text-center">
                <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">Nenhuma variação encontrada</h3>
                <p className="text-muted-foreground">
                  {searchTerm || colorFilter !== 'all' || sizeFilter !== 'all' || stockFilter !== 'all' 
                    ? 'Tente ajustar os filtros de busca' 
                    : 'Cadastre produtos com variações para gerenciar o estoque'}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Editar Estoque</DialogTitle>
            </DialogHeader>
            {editingVariation && (
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                  {editingVariation.products?.image_url && (
                    <img
                      src={editingVariation.products.image_url}
                      alt={editingVariation.products?.name}
                      className="w-16 h-16 object-cover rounded"
                    />
                  )}
                  <div>
                    <h3 className="font-semibold">{editingVariation.products?.name}</h3>
                    <p className="text-sm text-muted-foreground">SKU: {editingVariation.sku}</p>
                    {editingVariation.color && (
                      <p className="text-xs text-muted-foreground">Cor: {editingVariation.color}</p>
                    )}
                    {editingVariation.size && (
                      <p className="text-xs text-muted-foreground">Tamanho: {editingVariation.size}</p>
                    )}
                  </div>
                </div>

                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmitEdit)} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="stock_quantity"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Quantidade em Estoque</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                {...field}
                                onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="min_stock_level"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Estoque Mínimo</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                {...field}
                                onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="cost_price"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Preço de Custo</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                step="0.01"
                                placeholder="0.00"
                                {...field}
                                onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="selling_price"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Preço de Venda</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                step="0.01"
                                placeholder="0.00"
                                {...field}
                                onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="bg-muted/50 p-3 rounded-lg">
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-muted-foreground">Reservado:</span>
                        <span className="font-medium">{editingVariation.reserved_quantity} un.</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Disponível:</span>
                        <span className="font-medium">
                          {form.watch('stock_quantity') - editingVariation.reserved_quantity} un.
                        </span>
                      </div>
                    </div>

                    <div className="flex gap-2 justify-end pt-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setEditDialogOpen(false)}
                      >
                        Cancelar
                      </Button>
                      <Button type="submit" className="bg-primary hover:bg-primary/90">
                        <Save className="mr-2 h-4 w-4" />
                        Salvar
                      </Button>
                    </div>
                  </form>
                </Form>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Dialog para adicionar estoque manualmente */}
        <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Adicionar Estoque Manualmente</DialogTitle>
            </DialogHeader>
            <Form {...addForm}>
              <form onSubmit={addForm.handleSubmit(onSubmitAdd)} className="space-y-4">
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <Button
                      type="button"
                      variant={!isNewProduct ? "default" : "outline"}
                      size="sm"
                      onClick={() => setIsNewProduct(false)}
                    >
                      Produto Existente
                    </Button>
                    <Button
                      type="button"
                      variant={isNewProduct ? "default" : "outline"}
                      size="sm"
                      onClick={() => setIsNewProduct(true)}
                    >
                      Novo Produto
                    </Button>
                  </div>

                  {!isNewProduct ? (
                    <FormField
                      control={addForm.control}
                      name="product_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Produto</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione um produto" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {products.map((product) => (
                                <SelectItem key={product.id} value={product.id}>
                                  {product.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  ) : (
                    <FormField
                      control={addForm.control}
                      name="new_product_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nome do Novo Produto</FormLabel>
                          <FormControl>
                            <Input placeholder="Ex: Camiseta Básica" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </div>

                <FormField
                  control={addForm.control}
                  name="sku"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>SKU</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: CAM-001-P-AZ" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={addForm.control}
                    name="color"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cor (opcional)</FormLabel>
                        <FormControl>
                          <Input placeholder="Ex: Azul" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={addForm.control}
                    name="size"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tamanho (opcional)</FormLabel>
                        <FormControl>
                          <Input placeholder="Ex: P, M, G, 38, 40" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={addForm.control}
                    name="stock_quantity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Quantidade em Estoque</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="Digite a quantidade de itens"
                            {...field}
                            value={field.value || ''}
                            onChange={(e) => {const value = e.target.value; field.onChange(value === ""?"" : parseFloat(value));}}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={addForm.control}
                    name="min_stock_level"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Estoque Mínimo</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="1"
                            placeholder="Digite o mínimo de itens"
                            {...field}
                            value={field.value || ''}
                            onChange={(e) => {const value = e.target.value; field.onChange(value === ""?"" : parseFloat(value));}}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={addForm.control}
                    name="cost_price"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Preço de Custo</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="Digite o valor do produto"
                            {...field}
                            value={field.value || ''}
                            onChange={(e) => {const value = e.target.value; field.onChange(value === ""?"" : parseFloat(value));}}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={addForm.control}
                    name="selling_price"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Preço de Venda</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="Digite o valor do produto"
                            {...field}
                            value={field.value || ''}
                            onChange={(e) => {const value = e.target.value; field.onChange(value === ""?"" : parseFloat(value));}}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="flex gap-2 justify-end pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setAddDialogOpen(false)}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" className="bg-primary hover:bg-primary/90" disabled={loading}>
                    <Plus className="mr-2 h-4 w-4" />
                    Adicionar
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        {filteredVariations.length > 0 && (
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  Mostrando {startIndex + 1} a {Math.min(endIndex, filteredVariations.length)} de {filteredVariations.length} itens
                </div>
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious 
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                      />
                    </PaginationItem>
                    
                    {getPageNumbers().map((page, index) => (
                      <PaginationItem key={index}>
                        {page === 'ellipsis' ? (
                          <PaginationEllipsis />
                        ) : (
                          <PaginationLink
                            onClick={() => setCurrentPage(page as number)}
                            isActive={currentPage === page}
                            className="cursor-pointer"
                          >
                            {page}
                          </PaginationLink>
                        )}
                      </PaginationItem>
                    ))}
                    
                    <PaginationItem>
                      <PaginationNext 
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Stock;
