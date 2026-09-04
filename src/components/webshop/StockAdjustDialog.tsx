import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAdjustStock } from "@/hooks/useStockMovements";
import { Product } from "@/hooks/useProducts";

const stockAdjustSchema = z
  .object({
    reason: z.enum(["restock", "correction"]),
    amount: z.coerce.number().int("Moet een geheel getal zijn"),
  })
  .refine((data) => data.amount !== 0, {
    message: "Vul een aantal in dat niet 0 is",
    path: ["amount"],
  })
  .refine((data) => data.reason !== "restock" || data.amount > 0, {
    message: "Bijvullen moet een positief aantal zijn",
    path: ["amount"],
  });

type StockAdjustValues = z.infer<typeof stockAdjustSchema>;

interface StockAdjustDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: Product | null;
}

export function StockAdjustDialog({ open, onOpenChange, product }: StockAdjustDialogProps) {
  const adjustStock = useAdjustStock();

  const form = useForm<StockAdjustValues>({
    resolver: zodResolver(stockAdjustSchema),
    defaultValues: { reason: "restock", amount: 1 },
  });

  useEffect(() => {
    if (open) {
      form.reset({ reason: "restock", amount: 1 });
    }
  }, [open, form]);

  const reason = form.watch("reason");

  const onSubmit = async (values: StockAdjustValues) => {
    if (!product) return;
    try {
      await adjustStock.mutateAsync({
        productId: product.id,
        delta: values.amount,
        reason: values.reason,
      });
      onOpenChange(false);
    } catch {
      // Foutmelding wordt al getoond via de toast in useAdjustStock
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Voorraad aanpassen — {product?.name}</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Huidige voorraad: <span className="font-medium">{product?.stock_quantity ?? 0}</span> stuks
        </p>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reden</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="restock">Bijvullen</SelectItem>
                      <SelectItem value="correction">Correctie (bv. na inventarisatie)</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{reason === "restock" ? "Aantal bijgevuld" : "Correctie"}</FormLabel>
                  <FormControl>
                    <Input {...field} type="number" step="1" />
                  </FormControl>
                  {reason === "correction" && (
                    <FormDescription>
                      Gebruik een negatief getal om de voorraad te verminderen.
                    </FormDescription>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Annuleren
              </Button>
              <Button type="submit" disabled={adjustStock.isPending}>
                {adjustStock.isPending ? "Opslaan..." : "Opslaan"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
