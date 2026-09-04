import { useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Upload, Star, Trash2 } from "lucide-react";
import {
  useUploadProductImage,
  useDeleteProductImage,
  useSetPrimaryProductImage,
  getProductImageUrl,
  Product,
} from "@/hooks/useProducts";

interface ProductImagesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: Product | null;
}

export function ProductImagesDialog({ open, onOpenChange, product }: ProductImagesDialogProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadImage = useUploadProductImage();
  const deleteImage = useDeleteProductImage();
  const setPrimaryImage = useSetPrimaryProductImage();

  const images = [...(product?.product_images || [])].sort(
    (a, b) => a.sort_order - b.sort_order
  );

  const handleFilesSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!product) return;
    const files = Array.from(e.target.files || []);
    for (const file of files) {
      await uploadImage.mutateAsync({ productId: product.id, file });
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Afbeeldingen — {product?.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFilesSelected}
            accept="image/*"
            multiple
            className="hidden"
          />
          <Button
            type="button"
            variant="outline"
            className="gap-2"
            onClick={() => fileInputRef.current?.click()}
            disabled={!product || uploadImage.isPending}
          >
            <Upload className="h-4 w-4" />
            {uploadImage.isPending ? "Uploaden..." : "Afbeeldingen toevoegen"}
          </Button>

          {images.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nog geen afbeeldingen toegevoegd</p>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              {images.map((image) => (
                <div key={image.id} className="relative space-y-2 rounded-lg border p-2">
                  <img
                    src={getProductImageUrl(image.storage_path)}
                    alt={image.alt_text || product?.name || ""}
                    className="h-32 w-full rounded object-cover"
                  />
                  {image.is_primary && (
                    <Badge className="absolute left-3 top-3 gap-1">
                      <Star className="h-3 w-3" />
                      Hoofdafbeelding
                    </Badge>
                  )}
                  <div className="flex items-center justify-between gap-2">
                    {!image.is_primary && product ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          setPrimaryImage.mutate({ productId: product.id, imageId: image.id })
                        }
                      >
                        Als hoofdafbeelding
                      </Button>
                    ) : (
                      <span />
                    )}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() =>
                        deleteImage.mutate({ id: image.id, storage_path: image.storage_path })
                      }
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
