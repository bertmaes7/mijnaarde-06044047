import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Tables, TablesUpdate } from "@/integrations/supabase/types";

export type ShopSettings = Tables<"shop_settings">;
export type UpdateShopSettingsData = TablesUpdate<"shop_settings">;

export function useShopSettings() {
  return useQuery({
    queryKey: ["shop-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shop_settings")
        .select("*")
        .eq("id", true)
        .maybeSingle();
      if (error) throw error;
      return data as ShopSettings | null;
    },
  });
}

export function useUpdateShopSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: UpdateShopSettingsData) => {
      const { error } = await supabase.from("shop_settings").update(data).eq("id", true);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shop-settings"] });
      toast.success("Instellingen opgeslagen");
    },
    onError: () => {
      toast.error("Fout bij het opslaan van instellingen");
    },
  });
}
