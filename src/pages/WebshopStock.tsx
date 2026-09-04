import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Boxes, History } from "lucide-react";
import { useProducts } from "@/hooks/useProducts";
import { useStockMovements } from "@/hooks/useStockMovements";
import { StockAdjustDialog } from "@/components/webshop/StockAdjustDialog";

const reasonLabels: Record<string, string> = {
  restock: "Bijvullen",
  sale: "Verkoop",
  correction: "Correctie",
  return: "Retour",
};

const formatDateTime = (value: string) =>
  new Date(value).toLocaleString("nl-BE", { dateStyle: "medium", timeStyle: "short" });

export default function WebshopStock() {
  const { data: products = [], isLoading } = useProducts();
  const { data: movements = [], isLoading: isLoadingMovements } = useStockMovements();

  const [adjustingProductId, setAdjustingProductId] = useState<string | null>(null);
  const adjustingProduct = products.find((p) => p.id === adjustingProductId) || null;

  return (
    <MainLayout>
      <div className="space-y-6">
        <PageHeader
          title="Voorraad"
          description="Beheer de voorraad van producten in de webshop"
        />

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Boxes className="h-5 w-5 text-primary" />
              Producten
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              </div>
            ) : products.length === 0 ? (
              <p className="py-8 text-center text-muted-foreground">Nog geen producten aangemaakt</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Product</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead className="text-right">Voorraad</TableHead>
                    <TableHead className="w-[180px]">Acties</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.map((product) => (
                    <TableRow key={product.id} className="hover:bg-muted/30">
                      <TableCell className="font-medium">{product.name}</TableCell>
                      <TableCell className="text-muted-foreground">{product.sku || "-"}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant={product.stock_quantity === 0 ? "destructive" : "secondary"}>
                          {product.stock_quantity} stuks
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setAdjustingProductId(product.id)}
                        >
                          Voorraad aanpassen
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <History className="h-5 w-5 text-primary" />
              Historiek
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoadingMovements ? (
              <div className="flex items-center justify-center py-12">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              </div>
            ) : movements.length === 0 ? (
              <p className="py-8 text-center text-muted-foreground">Nog geen voorraadwijzigingen</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Datum</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Reden</TableHead>
                    <TableHead className="text-right">Wijziging</TableHead>
                    <TableHead>Door</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {movements.map((movement) => (
                    <TableRow key={movement.id} className="hover:bg-muted/30">
                      <TableCell>{formatDateTime(movement.created_at)}</TableCell>
                      <TableCell>{movement.product?.name || "-"}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {reasonLabels[movement.reason] || movement.reason}
                        </Badge>
                      </TableCell>
                      <TableCell
                        className={
                          movement.delta >= 0
                            ? "text-right font-medium text-green-600"
                            : "text-right font-medium text-destructive"
                        }
                      >
                        {movement.delta > 0 ? `+${movement.delta}` : movement.delta}
                      </TableCell>
                      <TableCell>
                        {movement.created_by_member
                          ? `${movement.created_by_member.first_name} ${movement.created_by_member.last_name}`
                          : "Systeem"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <StockAdjustDialog
        open={!!adjustingProductId}
        onOpenChange={(open) => !open && setAdjustingProductId(null)}
        product={adjustingProduct}
      />
    </MainLayout>
  );
}
