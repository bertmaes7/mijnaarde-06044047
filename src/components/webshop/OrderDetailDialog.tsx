import { Link } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { FileText } from "lucide-react";
import { useOrder, useUpdateOrderStatus, OrderStatus } from "@/hooks/useOrders";

const statusLabels: Record<OrderStatus, string> = {
  pending: "In behandeling",
  paid: "Betaald",
  failed: "Mislukt",
  cancelled: "Geannuleerd",
  refunded: "Terugbetaald",
  fulfilled: "Verzonden",
};

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("nl-BE", { style: "currency", currency: "EUR" }).format(amount);

const formatDateTime = (value: string) =>
  new Date(value).toLocaleString("nl-BE", { dateStyle: "medium", timeStyle: "short" });

interface OrderDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string | null;
}

export function OrderDetailDialog({ open, onOpenChange, orderId }: OrderDetailDialogProps) {
  const { data: order, isLoading } = useOrder(orderId || undefined);
  const updateStatus = useUpdateOrderStatus();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Bestelling {order?.order_number}</DialogTitle>
        </DialogHeader>

        {isLoading || !order ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Klant</p>
                <p className="font-medium">
                  {order.member
                    ? `${order.member.first_name} ${order.member.last_name}`
                    : "Gastbestelling"}
                </p>
                {order.member?.email && (
                  <p className="text-sm text-muted-foreground">{order.member.email}</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Status</span>
                <Select
                  value={order.status}
                  onValueChange={(value) =>
                    updateStatus.mutate({ id: order.id, status: value as OrderStatus })
                  }
                >
                  <SelectTrigger className="w-44">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(statusLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <p className="text-sm text-muted-foreground">Besteld op</p>
              <p>{formatDateTime(order.created_at)}</p>
            </div>

            <Separator />

            <div>
              <p className="mb-2 text-sm font-medium">Leveringsadres</p>
              {order.shipping_street ? (
                <p className="text-sm text-muted-foreground">
                  {order.shipping_street} {order.shipping_house_number}
                  <br />
                  {order.shipping_postal_code} {order.shipping_city}
                  <br />
                  {order.shipping_country}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">Geen leveringsadres geregistreerd</p>
              )}
            </div>

            <Separator />

            <div>
              <p className="mb-2 text-sm font-medium">Bestelde artikelen</p>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead className="text-right">Aantal</TableHead>
                    <TableHead className="text-right">Prijs</TableHead>
                    <TableHead className="text-right">Totaal</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {order.order_items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{item.product_name}</TableCell>
                      <TableCell className="text-right">{item.quantity}</TableCell>
                      <TableCell className="text-right">{formatCurrency(item.unit_price)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(item.total)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="mt-4 space-y-1 border-t pt-4 text-sm">
                <div className="flex justify-between">
                  <span>Subtotaal</span>
                  <span>{formatCurrency(order.subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Verzendkosten</span>
                  <span>{formatCurrency(order.shipping_cost)}</span>
                </div>
                <div className="flex justify-between">
                  <span>BTW</span>
                  <span>{formatCurrency(order.vat_amount)}</span>
                </div>
                <div className="flex justify-between text-base font-semibold">
                  <span>Totaal</span>
                  <span>{formatCurrency(order.total)}</span>
                </div>
              </div>
            </div>

            <Separator />

            <div>
              <p className="mb-2 text-sm font-medium">Factuur</p>
              {order.invoice ? (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    {order.invoice.invoice_number} — {order.invoice.status}
                  </span>
                  <Button asChild variant="outline" size="sm" className="gap-2">
                    <Link to="/finance/invoices">
                      <FileText className="h-4 w-4" />
                      Naar facturen
                    </Link>
                  </Button>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Nog geen factuur gekoppeld</p>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
