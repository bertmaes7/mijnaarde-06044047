import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface InventoryItem {
  id: string;
  fiscal_year: number;
  category: "bezittingen" | "schulden" | "rechten" | "verplichtingen";
  type: string;
  description: string;
  amount: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export type InventoryItemInsert = Omit<InventoryItem, "id" | "created_at" | "updated_at">;

// Inventory type options per category
export const INVENTORY_TYPES = {
  bezittingen: [
    { value: "onroerende_goederen_eigen", label: "Onroerende goederen behorend tot de vereniging in volle eigendom" },
    { value: "onroerende_goederen_andere", label: "Andere onroerende goederen" },
    { value: "machines_eigen", label: "Machines behorend tot de vereniging in volle eigendom" },
    { value: "machines_andere", label: "Andere machines" },
    { value: "roerende_goederen_eigen", label: "Roerende goederen en rollend materieel behorend tot de vereniging in volle eigendom" },
    { value: "roerende_goederen_andere", label: "Andere roerende goederen" },
    { value: "stocks", label: "Stocks" },
    { value: "schuldvorderingen", label: "Schuldvorderingen" },
    { value: "geldbeleggingen", label: "Geldbeleggingen" },
    { value: "liquiditeiten", label: "Liquiditeiten" },
    { value: "andere_activa", label: "Andere activa" },
  ],
  schulden: [
    { value: "financiele_schulden", label: "Financiële schulden" },
    { value: "schulden_leveranciers", label: "Schulden ten aanzien van leveranciers" },
    { value: "schulden_leden", label: "Schulden ten aanzien van leden" },
    { value: "fiscale_schulden", label: "Fiscale, salariële en sociale schulden" },
    { value: "andere_schulden", label: "Andere schulden" },
  ],
  rechten: [
    { value: "beloofde_subsidies", label: "Beloofde subsidies" },
    { value: "beloofde_schenkingen", label: "Beloofde schenkingen" },
    { value: "andere_rechten", label: "Andere rechten" },
  ],
  verplichtingen: [
    { value: "hypotheken", label: "Hypotheken en hypotheekbeloften" },
    { value: "gegeven_waarborgen", label: "Gegeven waarborgen" },
    { value: "andere_verbintenissen", label: "Andere verbintenissen" },
  ],
} as const;

export function useInventory(fiscalYear: number) {
  return useQuery({
    queryKey: ["inventory", fiscalYear],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("annual_report_inventory")
        .select("*")
        .eq("fiscal_year", fiscalYear)
        .order("category", { ascending: true })
        .order("type", { ascending: true });
      if (error) throw error;
      return data as InventoryItem[];
    },
  });
}

export function useCreateInventoryItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: InventoryItemInsert) => {
      const { data: newItem, error } = await supabase
        .from("annual_report_inventory")
        .insert(data)
        .select()
        .single();
      if (error) throw error;
      return newItem;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["inventory", variables.fiscal_year] });
      toast.success("Item toegevoegd aan inventaris");
    },
    onError: () => {
      toast.error("Fout bij toevoegen van item");
    },
  });
}

export function useUpdateInventoryItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data, fiscalYear }: { id: string; data: Partial<InventoryItemInsert>; fiscalYear: number }) => {
      const { error } = await supabase
        .from("annual_report_inventory")
        .update(data)
        .eq("id", id);
      if (error) throw error;
      return fiscalYear;
    },
    onSuccess: (fiscalYear) => {
      queryClient.invalidateQueries({ queryKey: ["inventory", fiscalYear] });
      toast.success("Item bijgewerkt");
    },
    onError: () => {
      toast.error("Fout bij bijwerken van item");
    },
  });
}

export function useDeleteInventoryItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, fiscalYear }: { id: string; fiscalYear: number }) => {
      const { error } = await supabase
        .from("annual_report_inventory")
        .delete()
        .eq("id", id);
      if (error) throw error;
      return fiscalYear;
    },
    onSuccess: (fiscalYear) => {
      queryClient.invalidateQueries({ queryKey: ["inventory", fiscalYear] });
      toast.success("Item verwijderd");
    },
    onError: () => {
      toast.error("Fout bij verwijderen van item");
    },
  });
}
