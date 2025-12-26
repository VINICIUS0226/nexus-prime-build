import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Upload, 
  X, 
  Star, 
  GripVertical, 
  Loader2, 
  ImagePlus,
  Trash2
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
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

interface ProductImage {
  id: string;
  image_url: string;
  is_primary: boolean;
  display_order: number;
  alt_text: string | null;
}

interface ProductImageUploadProps {
  productId: string;
  images: ProductImage[];
  onImagesUpdated: () => void;
}

export const ProductImageUpload = ({ productId, images, onImagesUpdated }: ProductImageUploadProps) => {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [imageToDelete, setImageToDelete] = useState<ProductImage | null>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);

    try {
      const uploadPromises = Array.from(files).map(async (file, index) => {
        // Validate file type
        if (!file.type.startsWith('image/')) {
          throw new Error(`${file.name} não é uma imagem válida`);
        }

        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
          throw new Error(`${file.name} é muito grande. Máximo 5MB.`);
        }

        // Generate unique filename
        const fileExt = file.name.split('.').pop();
        const fileName = `${productId}/${Date.now()}-${index}.${fileExt}`;

        // Upload to storage
        const { error: uploadError } = await supabase.storage
          .from('product-images')
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('product-images')
          .getPublicUrl(fileName);

        // Determine display order and if should be primary
        const maxOrder = images.length > 0 
          ? Math.max(...images.map(img => img.display_order)) 
          : -1;
        const isPrimary = images.length === 0 && index === 0;

        // Insert into product_images table
        const { error: dbError } = await supabase
          .from('product_images')
          .insert({
            product_id: productId,
            image_url: publicUrl,
            is_primary: isPrimary,
            display_order: maxOrder + 1 + index,
            alt_text: file.name.split('.')[0]
          });

        if (dbError) throw dbError;

        return publicUrl;
      });

      await Promise.all(uploadPromises);

      toast({
        title: "Imagens enviadas!",
        description: `${files.length} imagem(ns) adicionada(s) com sucesso.`,
      });

      onImagesUpdated();
    } catch (error: any) {
      toast({
        title: "Erro ao enviar imagens",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleSetPrimary = async (imageId: string) => {
    try {
      // Remove primary from all images
      await supabase
        .from('product_images')
        .update({ is_primary: false })
        .eq('product_id', productId);

      // Set new primary
      await supabase
        .from('product_images')
        .update({ is_primary: true })
        .eq('id', imageId);

      toast({
        title: "Imagem principal definida",
      });

      onImagesUpdated();
    } catch (error: any) {
      toast({
        title: "Erro ao definir imagem principal",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const openDeleteDialog = (image: ProductImage) => {
    setImageToDelete(image);
    setDeleteDialogOpen(true);
  };

  const handleDeleteImage = async () => {
    if (!imageToDelete) return;
    
    setDeletingId(imageToDelete.id);
    setDeleteDialogOpen(false);

    try {
      // Extract file path from URL
      const url = new URL(imageToDelete.image_url);
      const pathParts = url.pathname.split('/');
      const bucketIndex = pathParts.findIndex(part => part === 'product-images');
      const filePath = pathParts.slice(bucketIndex + 1).join('/');

      // Delete from storage
      await supabase.storage
        .from('product-images')
        .remove([filePath]);

      // Delete from database
      const { error } = await supabase
        .from('product_images')
        .delete()
        .eq('id', imageToDelete.id);

      if (error) throw error;

      // If deleted image was primary, set next image as primary
      if (imageToDelete.is_primary && images.length > 1) {
        const nextImage = images.find(img => img.id !== imageToDelete.id);
        if (nextImage) {
          await supabase
            .from('product_images')
            .update({ is_primary: true })
            .eq('id', nextImage.id);
        }
      }

      toast({
        title: "Imagem removida",
      });

      onImagesUpdated();
    } catch (error: any) {
      toast({
        title: "Erro ao remover imagem",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setDeletingId(null);
      setImageToDelete(null);
    }
  };

  const sortedImages = [...images].sort((a, b) => {
    if (a.is_primary) return -1;
    if (b.is_primary) return 1;
    return a.display_order - b.display_order;
  });

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ImagePlus className="h-5 w-5" />
            Gerenciar Imagens
          </CardTitle>
          <CardDescription>
            Adicione, remova ou defina a imagem principal do produto
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Upload Button */}
          <div className="flex items-center gap-4">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="w-full sm:w-auto"
            >
              {uploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Adicionar Imagens
                </>
              )}
            </Button>
            <p className="text-sm text-muted-foreground">
              Formatos: JPG, PNG, WebP (máx. 5MB cada)
            </p>
          </div>

          {/* Images Grid */}
          {sortedImages.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {sortedImages.map((image) => (
                <div
                  key={image.id}
                  className="relative group rounded-lg overflow-hidden border bg-muted aspect-square"
                >
                  <img
                    src={image.image_url}
                    alt={image.alt_text || "Imagem do produto"}
                    className="w-full h-full object-cover"
                  />
                  
                  {/* Primary Badge */}
                  {image.is_primary && (
                    <Badge className="absolute top-2 left-2 bg-yellow-500 text-yellow-950">
                      <Star className="h-3 w-3 mr-1 fill-current" />
                      Principal
                    </Badge>
                  )}

                  {/* Overlay with actions */}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    {!image.is_primary && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleSetPrimary(image.id)}
                        title="Definir como principal"
                      >
                        <Star className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => openDeleteDialog(image)}
                      disabled={deletingId === image.id}
                      title="Remover imagem"
                    >
                      {deletingId === image.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="border-2 border-dashed rounded-lg p-8 text-center">
              <ImagePlus className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
              <p className="text-muted-foreground">
                Nenhuma imagem adicionada ainda
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Clique no botão acima para adicionar imagens
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover imagem</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover esta imagem? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteImage}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
