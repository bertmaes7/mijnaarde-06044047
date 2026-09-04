import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { PageHeader } from "@/components/layout/PageHeader";
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
import { ShoppingCart } from "lucide-react";
import { useOrders, OrderStatus } from "@/hooks/useOrders";
import { OrderDetailDialog } from "@/components/webshop/OrderDetailDialog";

const statusLabels: Record<OrderStatus, string> = {
  pending: "In behandeling",
  paid: "Betaald",
  failed: "Mislukt",
  cancelled: "Geannuleerd",
  refunded: "Terugbetaald",
  fulfilled: "Verzonden",
};

const statusVariants: Record<OrderStatus, "default" | "secondary" | "destructive" | "outline"> = {
  pending: "secondary",
  paid: "default",
  failed: "destructive",
  cancelled: "outline",
  refunded: "outline",
  fulfilled: "default",
};

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("nl-BE", { style: "currency", currency: "EUR" }).format(amount);

const formatDate = (value: string) => new Date(value).toLocaleDateString("nl-BE");

export default function WebshopOrders() {
  const { data: orders = [], isLoading } = useOrders();
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  return (
    <MainLayout>
      <div className="space-y-6">
        <PageHeader title="Bestellingen" description="Overzicht van webshopbestellingen" />

        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              </div>
            ) : orders.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <ShoppingCart className="h-12 w-12 text-muted-foreground/50" />
                <p className="mt-4 text-muted-foreground">Nog geen bestellingen</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Ordernummer</TableHead>
                    <TableHead>Klant</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Totaal</TableHead>
                    <TableHead>Datum</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((order) => (
                    <TableRow
                      key={order.id}
                      className="cursor-pointer hover:bg-muted/30"
                      onClick={() => setSelectedOrderId(order.id)}
                    >
                      <TableCell className="font-medium">{order.order_number}</TableCell>
                      <TableCell>
                        {order.member
                          ? `${order.member.first_name} ${order.member.last_name}`
                          : "Gastbestelling"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusVariants[order.status as OrderStatus] || "outline"}>
                          {statusLabels[order.status as OrderStatus] || order.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(order.total)}
                      </TableCell>
                      <TableCell>{formatDate(order.created_at)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <OrderDetailDialog
        open={!!selectedOrderId}
        onOpenChange={(open) => !open && setSelectedOrderId(null)}
        orderId={selectedOrderId}
      />
    </MainLayout>
  );
}
