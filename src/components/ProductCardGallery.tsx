import { useState } from 'react';
import { ChevronLeft, ChevronRight, Package } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProductImage {
  id: string;
  image_url: string;
  is_primary: boolean;
  display_order: number;
  alt_text: string | null;
}

interface ProductCardGalleryProps {
  images: ProductImage[];
  fallbackUrl: string | null;
  productName: string;
  onClick: () => void;
  children?: React.ReactNode;
}

export const ProductCardGallery = ({ 
  images, 
  fallbackUrl, 
  productName, 
  onClick,
  children 
}: ProductCardGalleryProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [failedUrls, setFailedUrls] = useState<Set<string>>(new Set());

  // Ordenar imagens: principal primeiro, depois por display_order
  const sortedImages = [...images].sort((a, b) => {
    if (a.is_primary && !b.is_primary) return -1;
    if (!a.is_primary && b.is_primary) return 1;
    return a.display_order - b.display_order;
  });

  // Se não houver imagens na galeria, usar fallback
  const hasImages = sortedImages.length > 0;
  const currentImage = hasImages ? sortedImages[currentIndex] : null;
  const preferredImageUrl = currentImage?.image_url || fallbackUrl;
  const imageUrl =
    preferredImageUrl && !failedUrls.has(preferredImageUrl)
      ? preferredImageUrl
      : fallbackUrl && fallbackUrl !== preferredImageUrl && !failedUrls.has(fallbackUrl)
        ? fallbackUrl
        : null;
  const totalImages = sortedImages.length;

  const goToPrevious = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev === 0 ? totalImages - 1 : prev - 1));
  };

  const goToNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev === totalImages - 1 ? 0 : prev + 1));
  };

  return (
    <div className="relative cursor-pointer group/gallery" onClick={onClick}>
      {imageUrl ? (
        <img
          src={imageUrl}
          alt={currentImage?.alt_text || productName}
          className="w-full h-56 object-cover group-hover:scale-105 transition-transform duration-300"
          onError={() => {
            setFailedUrls((prev) => new Set(prev).add(imageUrl));
          }}
        />
      ) : (
        <div className="w-full h-56 bg-muted flex items-center justify-center group-hover:bg-muted/80 transition-colors">
          <Package className="h-16 w-16 text-muted-foreground opacity-30" />
        </div>
      )}

      {/* Navegação por setas - só mostra se tiver mais de uma imagem */}
      {totalImages > 1 && (
        <>
          <button
            onClick={goToPrevious}
            className={cn(
              "absolute left-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full",
              "bg-background/80 backdrop-blur-sm shadow-md",
              "opacity-0 group-hover/gallery:opacity-100 transition-opacity duration-200",
              "hover:bg-background hover:scale-110 active:scale-95"
            )}
            aria-label="Imagem anterior"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={goToNext}
            className={cn(
              "absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full",
              "bg-background/80 backdrop-blur-sm shadow-md",
              "opacity-0 group-hover/gallery:opacity-100 transition-opacity duration-200",
              "hover:bg-background hover:scale-110 active:scale-95"
            )}
            aria-label="Próxima imagem"
          >
            <ChevronRight className="h-4 w-4" />
          </button>

          {/* Indicadores de posição */}
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
            {sortedImages.map((_, index) => (
              <button
                key={index}
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentIndex(index);
                }}
                className={cn(
                  "w-2 h-2 rounded-full transition-all duration-200",
                  index === currentIndex 
                    ? "bg-primary scale-110" 
                    : "bg-background/60 hover:bg-background/80"
                )}
                aria-label={`Ir para imagem ${index + 1}`}
              />
            ))}
          </div>
        </>
      )}

      {/* Contador de imagens */}
      {totalImages > 1 && (
        <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-background/80 backdrop-blur-sm text-xs font-medium">
          {currentIndex + 1}/{totalImages}
        </div>
      )}

      {/* Children para badges de categoria, estoque, etc */}
      {children}
    </div>
  );
};
