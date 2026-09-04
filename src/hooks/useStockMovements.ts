import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Tables } from "@/integrations/supabase/types";

export type StockMovementReason = Tables<"stock_movements">["reason"];
export type StockAdjustReason = "restock" | "correction";

export type StockMovement = Tables<"stock_movements"> & {
  created_by_member?: { id: string; first_name: string; last_name: string } | null;
  product?: { id: string; name: string; sku: string | null } | null;
};

export function useStockMovements(productId?: string) {
  return useQuery({
    queryKey: ["stock-movements", productId],
    queryFn: async () => {
      let query = supabase
        .from("stock_movements")
        .select(
          `
          *,
          created_by_member:members(id, first_name, last_name),
          product:products(id, name, sku)
        `
        )
        .order("created_at", { ascending: false })
        .limit(100);

      if (productId) {
        query = query.eq("product_id", productId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as StockMovement[];
    },
  });
}

export function useAdjustStock() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      productId,
      delta,
      reason,
    }: {
      productId: string;
      delta: number;
      reason: StockAdjustReason;
    }) => {
      const { error } = await supabase.rpc("adjust_stock", {
        p_product_id: productId,
        p_delta: delta,
        p_reason: reason,
        p_order_id: null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["product"] });
      queryClient.invalidateQueries({ queryKey: ["stock-movements"] });
      toast.success("Voorraad aangepast");
    },
    onError: (error: unknown) => {
      const message =
        error instanceof Error ? error.message : "Fout bij het aanpassen van voorraad";
      toast.error(message);
    },
  });
}
