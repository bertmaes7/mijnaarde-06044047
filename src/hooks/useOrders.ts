import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Tables } from "@/integrations/supabase/types";

export type OrderStatus =
  | "pending"
  | "paid"
  | "failed"
  | "cancelled"
  | "refunded"
  | "fulfilled";

export type OrderItem = Tables<"order_items">;

export type OrderMemberRef = {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
} | null;

export type Order = Tables<"orders"> & {
  member?: OrderMemberRef;
};

export type OrderDetail = Order & {
  order_items: OrderItem[];
  invoice: { id: string; invoice_number: string; status: string } | null;
};

const ORDER_SELECT = `
  *,
  member:members(id, first_name, last_name, email)
`;

export function useOrders() {
  return useQuery({
    queryKey: ["orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select(ORDER_SELECT)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as unknown as Order[];
    },
  });
}

export function useOrder(id: string | undefined) {
  return useQuery({
    queryKey: ["order", id],
    queryFn: async (): Promise<OrderDetail | null> => {
      if (!id) return null;

      const { data: order, error: orderError } = await supabase
        .from("orders")
        .select(ORDER_SELECT)
        .eq("id", id)
        .maybeSingle();
      if (orderError) throw orderError;
      if (!order) return null;

      const { data: items, error: itemsError } = await supabase
        .from("order_items")
        .select("*")
        .eq("order_id", id)
        .order("created_at", { ascending: true });
      if (itemsError) throw itemsError;

      const { data: invoice, error: invoiceError } = await supabase
        .from("invoices")
        .select("id, invoice_number, status")
        .eq("order_id", id)
        .maybeSingle();
      if (invoiceError) throw invoiceError;

      return {
        ...(order as unknown as Order),
        order_items: items || [],
        invoice: invoice || null,
      };
    },
    enabled: !!id,
  });
}

export function useUpdateOrderStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: OrderStatus }) => {
      const { error } = await supabase.from("orders").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["order"] });
      toast.success("Bestelstatus bijgewerkt");
    },
    onError: () => {
      toast.error("Fout bij het bijwerken van bestelstatus");
    },
  });
}
