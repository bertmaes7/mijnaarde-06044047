import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { Plus, Pencil, Images, Trash2, Package } from "lucide-react";
import { useProducts, useDeleteProduct } from "@/hooks/useProducts";
import { ProductFormDialog } from "@/components/webshop/ProductFormDialog";
import { ProductImagesDialog } from "@/components/webshop/ProductImagesDialog";

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("nl-BE", { style: "currency", currency: "EUR" }).format(amount);

export default function WebshopProducts() {
  const { data: products = [], isLoading } = useProducts();
  const deleteProduct = useDeleteProduct();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [imagesProductId, setImagesProductId] = useState<string | null>(null);
  const [deletingProductId, setDeletingProductId] = useState<string | null>(null);

  const editingProduct = products.find((p) => p.id === editingProductId) || null;
  const imagesProduct = products.find((p) => p.id === imagesProductId) || null;
  const deletingProduct = products.find((p) => p.id === deletingProductId) || null;

  const handleAddNew = () => {
    setEditingProductId(null);
    setIsFormOpen(true);
  };

  const handleEdit = (productId: string) => {
    setEditingProductId(productId);
    setIsFormOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deletingProductId) return;
    await deleteProduct.mutateAsync(deletingProductId);
    setDeletingProductId(null);
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <PageHeader
          title="Producten"
          description="Beheer het productaanbod van de webshop"
          actions={
            <Button className="gap-2" onClick={handleAddNew}>
              <Plus className="h-4 w-4" />
              Nieuw product
            </Button>
          }
        />

        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              </div>
            ) : products.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Package className="h-12 w-12 text-muted-foreground/50" />
                <p className="mt-4 text-muted-foreground">Nog geen producten aangemaakt</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Naam</TableHead>
                    <TableHead>Categorie</TableHead>
                    <TableHead className="text-right">Prijs</TableHead>
                    <TableHead className="text-right">BTW</TableHead>
                    <TableHead className="text-right">Voorraad</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[160px]">Acties</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.map((product) => (
                    <TableRow key={product.id} className="hover:bg-muted/30">
                      <TableCell className="font-medium">{product.name}</TableCell>
                      <TableCell>{product.category?.name || "-"}</TableCell>
                      <TableCell className="text-right">{formatCurrency(product.price)}</TableCell>
                      <TableCell className="text-right">{product.vat_rate}%</TableCell>
                      <TableCell className="text-right">{product.stock_quantity}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          <Badge variant={product.is_published ? "default" : "secondary"}>
                            {product.is_published ? "Gepubliceerd" : "Concept"}
                          </Badge>
                          {!product.is_active && <Badge variant="outline">Inactief</Badge>}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            title="Bewerken"
                            onClick={() => handleEdit(product.id)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            title="Afbeeldingen"
                            onClick={() => setImagesProductId(product.id)}
                          >
                            <Images className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            title="Verwijderen"
                            className="text-destructive hover:text-destructive"
                            onClick={() => setDeletingProductId(product.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <ProductFormDialog open={isFormOpen} onOpenChange={setIsFormOpen} product={editingProduct} />
      <ProductImagesDialog
        open={!!imagesProductId}
        onOpenChange={(open) => !open && setImagesProductId(null)}
        product={imagesProduct}
      />

      <AlertDialog
        open={!!deletingProductId}
        onOpenChange={(open) => !open && setDeletingProductId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Product verwijderen?</AlertDialogTitle>
            <AlertDialogDescription>
              Weet je zeker dat je "{deletingProduct?.name}" wilt verwijderen? Deze actie kan niet
              ongedaan worden gemaakt.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuleren</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete}>Verwijderen</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MainLayout>
  );
}
