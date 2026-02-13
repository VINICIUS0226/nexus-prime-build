import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { 
  Edit, 
  Save, 
  X, 
  Loader2, 
  Plus, 
  Trash2,
  Package
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// Product schema
const productSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório").max(200, "Máximo 200 caracteres"),
  description: z.string().max(2000, "Máximo 2000 caracteres").optional().nullable(),
  category: z.string().max(100, "Máximo 100 caracteres").optional().nullable(),
  barcode: z.string().max(50, "Máximo 50 caracteres").optional().nullable(),
  cost_price: z.coerce.number().min(0, "Deve ser positivo").optional().nullable(),
  selling_price: z.coerce.number().min(0, "Deve ser positivo").optional().nullable(),
  profit_margin: z.coerce.number().min(0).max(100, "Máximo 100%").optional().nullable(),
});

// Variation schema
const variationSchema = z.object({
  sku: z.string().min(1, "SKU é obrigatório").max(50, "Máximo 50 caracteres"),
  size: z.string().max(20, "Máximo 20 caracteres").optional().nullable(),
  color: z.string().max(30, "Máximo 30 caracteres").optional().nullable(),
  stock_quantity: z.coerce.number().min(0, "Deve ser positivo").default(0),
  min_stock_level: z.coerce.number().min(0, "Deve ser positivo").default(5),
  selling_price: z.coerce.number().min(0, "Deve ser positivo").optional().nullable(),
  cost_price: z.coerce.number().min(0, "Deve ser positivo").optional().nullable(),
});

type ProductFormData = z.infer<typeof productSchema>;
type VariationFormData = z.infer<typeof variationSchema>;

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

interface ProductEditFormProps {
  product: Product;
  onProductUpdated: () => void;
}

export const ProductEditForm = ({ product, onProductUpdated }: ProductEditFormProps) => {
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Variation management
  const [variationDialogOpen, setVariationDialogOpen] = useState(false);
  const [editingVariation, setEditingVariation] = useState<ProductVariation | null>(null);
  const [savingVariation, setSavingVariation] = useState(false);
  const [deleteVariationDialog, setDeleteVariationDialog] = useState(false);
  const [variationToDelete, setVariationToDelete] = useState<ProductVariation | null>(null);
  const [deletingVariation, setDeletingVariation] = useState(false);

  const productForm = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: product.name,
      description: product.description || "",
      category: product.category || "",
      barcode: product.barcode || "",
      cost_price: product.cost_price || undefined,
      selling_price: product.selling_price || undefined,
      profit_margin: product.profit_margin || undefined,
    },
  });

  const variationForm = useForm<VariationFormData>({
    resolver: zodResolver(variationSchema),
    defaultValues: {
      sku: "",
      size: "",
      color: "",
      stock_quantity: 0,
      min_stock_level: 5,
    },
  });

  // Reset form when product changes
  useEffect(() => {
    productForm.reset({
      name: product.name,
      description: product.description || "",
      category: product.category || "",
      barcode: product.barcode || "",
      cost_price: product.cost_price || undefined,
      selling_price: product.selling_price || undefined,
      profit_margin: product.profit_margin || undefined,
    });
  }, [product]);

  // Calculate profit margin automatically
  const watchCostPrice = productForm.watch("cost_price");
  const watchSellingPrice = productForm.watch("selling_price");

  useEffect(() => {
    if (watchCostPrice && watchSellingPrice && watchCostPrice > 0) {
      const margin = ((watchSellingPrice - watchCostPrice) / watchCostPrice) * 100;
      productForm.setValue("profit_margin", Math.round(margin * 100) / 100);
    }
  }, [watchCostPrice, watchSellingPrice]);

  const handleSaveProduct = async (data: ProductFormData) => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("products")
        .update({
          name: data.name,
          description: data.description || null,
          category: data.category || null,
          barcode: data.barcode || null,
          cost_price: data.cost_price || null,
          selling_price: data.selling_price || null,
          profit_margin: data.profit_margin || null,
        })
        .eq("id", product.id);

      if (error) throw error;

      toast({
        title: "Produto atualizado",
        description: "As informações foram salvas com sucesso.",
      });

      setIsEditing(false);
      onProductUpdated();
    } catch (error: any) {
      toast({
        title: "Erro ao salvar",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const openVariationDialog = (variation?: ProductVariation) => {
    if (variation) {
      setEditingVariation(variation);
      variationForm.reset({
        sku: variation.sku,
        size: variation.size || "",
        color: variation.color || "",
        stock_quantity: variation.stock_quantity,
        min_stock_level: variation.min_stock_level || 5,
        selling_price: variation.selling_price ?? undefined,
        cost_price: variation.cost_price ?? undefined,
      });
    } else {
      setEditingVariation(null);
      variationForm.reset({
        sku: "",
        size: "",
        color: "",
        stock_quantity: 0,
        min_stock_level: 5,
        selling_price: product.selling_price ?? undefined,
        cost_price: product.cost_price ?? undefined,
      });
    }
    setVariationDialogOpen(true);
  };

  const handleSaveVariation = async (data: VariationFormData) => {
    setSavingVariation(true);
    try {
      if (editingVariation) {
        // Update existing variation
        const { error } = await supabase
          .from("product_variations")
          .update({
            sku: data.sku,
            size: data.size || null,
            color: data.color || null,
            stock_quantity: data.stock_quantity,
            min_stock_level: data.min_stock_level,
            selling_price: data.selling_price ?? null,
            cost_price: data.cost_price ?? null,
          })
          .eq("id", editingVariation.id);

        if (error) throw error;

        toast({
          title: "Variação atualizada",
        });
      } else {
        // Create new variation
        const { error } = await supabase
          .from("product_variations")
          .insert({
            product_id: product.id,
            sku: data.sku,
            size: data.size || null,
            color: data.color || null,
            stock_quantity: data.stock_quantity,
            min_stock_level: data.min_stock_level,
            selling_price: data.selling_price ?? null,
            cost_price: data.cost_price ?? null,
          });

        if (error) throw error;

        toast({
          title: "Variação adicionada",
        });
      }

      setVariationDialogOpen(false);
      onProductUpdated();
    } catch (error: any) {
      toast({
        title: "Erro ao salvar variação",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSavingVariation(false);
    }
  };

  const openDeleteVariationDialog = (variation: ProductVariation) => {
    setVariationToDelete(variation);
    setDeleteVariationDialog(true);
  };

  const handleDeleteVariation = async () => {
    if (!variationToDelete) return;
    
    setDeletingVariation(true);
    try {
      const { error } = await supabase
        .from("product_variations")
        .delete()
        .eq("id", variationToDelete.id);

      if (error) throw error;

      toast({
        title: "Variação removida",
      });

      setDeleteVariationDialog(false);
      setVariationToDelete(null);
      onProductUpdated();
    } catch (error: any) {
      toast({
        title: "Erro ao remover variação",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setDeletingVariation(false);
    }
  };

  const cancelEditing = () => {
    productForm.reset({
      name: product.name,
      description: product.description || "",
      category: product.category || "",
      barcode: product.barcode || "",
      cost_price: product.cost_price || undefined,
      selling_price: product.selling_price || undefined,
      profit_margin: product.profit_margin || undefined,
    });
    setIsEditing(false);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Edit className="h-5 w-5" />
                Editar Produto
              </CardTitle>
              <CardDescription>
                Atualize as informações do produto
              </CardDescription>
            </div>
            {!isEditing ? (
              <Button onClick={() => setIsEditing(true)}>
                <Edit className="h-4 w-4 mr-2" />
                Editar
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button variant="outline" onClick={cancelEditing} disabled={saving}>
                  <X className="h-4 w-4 mr-2" />
                  Cancelar
                </Button>
                <Button onClick={productForm.handleSubmit(handleSaveProduct)} disabled={saving}>
                  {saving ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Salvar
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <Form {...productForm}>
            <form className="space-y-6">
              {/* Basic Info */}
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={productForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome do Produto *</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          disabled={!isEditing}
                          placeholder="Ex: Vestido Floral"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={productForm.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Categoria</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          value={field.value || ""}
                          disabled={!isEditing}
                          placeholder="Ex: Vestidos"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={productForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descrição</FormLabel>
                    <FormControl>
                      <Textarea 
                        {...field} 
                        value={field.value || ""}
                        disabled={!isEditing}
                        placeholder="Descreva o produto em detalhes..."
                        rows={4}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={productForm.control}
                name="barcode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Código de Barras</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        value={field.value || ""}
                        disabled={!isEditing}
                        placeholder="Ex: 7891234567890"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Separator />

              {/* Pricing */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Preços</h3>
                <div className="grid gap-4 sm:grid-cols-3">
                  <FormField
                    control={productForm.control}
                    name="cost_price"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Preço de Custo (R$)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number"
                            step="0.01"
                            {...field}
                            value={field.value ?? ""}
                            disabled={!isEditing}
                            placeholder="0.00"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={productForm.control}
                    name="selling_price"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Preço de Venda (R$)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number"
                            step="0.01"
                            {...field}
                            value={field.value ?? ""}
                            disabled={!isEditing}
                            placeholder="0.00"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={productForm.control}
                    name="profit_margin"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Margem de Lucro (%)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number"
                            step="0.01"
                            {...field}
                            value={field.value ?? ""}
                            disabled={!isEditing}
                            placeholder="Calculado automaticamente"
                            className="bg-muted"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* Variations Management */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Variações do Produto
              </CardTitle>
              <CardDescription>
                Gerencie tamanhos, cores e estoque
              </CardDescription>
            </div>
            <Button onClick={() => openVariationDialog()}>
              <Plus className="h-4 w-4 mr-2" />
              Nova Variação
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {product.product_variations.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>SKU</TableHead>
                  <TableHead>Tamanho</TableHead>
                  <TableHead>Cor</TableHead>
                  <TableHead>Preço Venda</TableHead>
                  <TableHead>Preço Custo</TableHead>
                  <TableHead>Estoque</TableHead>
                  <TableHead>Reservado</TableHead>
                  <TableHead>Disponível</TableHead>
                  <TableHead>Mín.</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {product.product_variations.map((variation) => {
                  const available = variation.stock_quantity - variation.reserved_quantity;
                  const isLow = variation.min_stock_level && available <= variation.min_stock_level;
                  const isOut = available === 0;
                  
                  return (
                    <TableRow key={variation.id}>
                      <TableCell className="font-mono text-sm">{variation.sku}</TableCell>
                      <TableCell>{variation.size || "-"}</TableCell>
                      <TableCell>
                        {variation.color ? (
                          <Badge variant="outline">{variation.color}</Badge>
                        ) : "-"}
                      </TableCell>
                      <TableCell>{variation.selling_price != null ? `R$ ${variation.selling_price.toFixed(2)}` : "-"}</TableCell>
                      <TableCell>{variation.cost_price != null ? `R$ ${variation.cost_price.toFixed(2)}` : "-"}</TableCell>
                      <TableCell>{variation.stock_quantity}</TableCell>
                      <TableCell>{variation.reserved_quantity}</TableCell>
                      <TableCell>
                        <span className={isOut ? "text-destructive font-semibold" : isLow ? "text-yellow-600 font-semibold" : "font-semibold"}>
                          {available}
                        </span>
                      </TableCell>
                      <TableCell>{variation.min_stock_level || 5}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openVariationDialog(variation)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openDeleteVariationDialog(variation)}
                            className="text-destructive hover:text-destructive"
                            disabled={variation.reserved_quantity > 0}
                            title={variation.reserved_quantity > 0 ? "Não é possível excluir variação com itens reservados" : "Excluir variação"}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8">
              <Package className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
              <p className="text-muted-foreground">Nenhuma variação cadastrada</p>
              <p className="text-sm text-muted-foreground mt-1">
                Adicione variações para gerenciar tamanhos e cores
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Variation Dialog */}
      <Dialog open={variationDialogOpen} onOpenChange={setVariationDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingVariation ? "Editar Variação" : "Nova Variação"}
            </DialogTitle>
            <DialogDescription>
              {editingVariation 
                ? "Atualize as informações da variação" 
                : "Adicione uma nova variação de tamanho ou cor"}
            </DialogDescription>
          </DialogHeader>
          
          <Form {...variationForm}>
            <form onSubmit={variationForm.handleSubmit(handleSaveVariation)} className="space-y-4">
              <FormField
                control={variationForm.control}
                name="sku"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Código SKU *</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        placeholder="Ex: VEST-FLORAL-M-AZ"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={variationForm.control}
                  name="size"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tamanho</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          value={field.value || ""}
                          placeholder="Ex: P, M, G, GG"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={variationForm.control}
                  name="color"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cor</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          value={field.value || ""}
                          placeholder="Ex: Azul, Vermelho"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={variationForm.control}
                  name="selling_price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Preço de Venda (R$)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number"
                          step="0.01"
                          {...field}
                          value={field.value ?? ""}
                          placeholder="0.00"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={variationForm.control}
                  name="cost_price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Preço de Custo (R$)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number"
                          step="0.01"
                          {...field}
                          value={field.value ?? ""}
                          placeholder="0.00"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={variationForm.control}
                  name="stock_quantity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Quantidade em Estoque</FormLabel>
                      <FormControl>
                        <Input 
                          type="number"
                          {...field}
                          min={0}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={variationForm.control}
                  name="min_stock_level"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Estoque Mínimo</FormLabel>
                      <FormControl>
                        <Input 
                          type="number"
                          {...field}
                          min={0}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setVariationDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={savingVariation}>
                  {savingVariation ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Salvar
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Variation Confirmation */}
      <AlertDialog open={deleteVariationDialog} onOpenChange={setDeleteVariationDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Variação</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a variação <strong>{variationToDelete?.sku}</strong>?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingVariation}>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteVariation}
              disabled={deletingVariation}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deletingVariation ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
