import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

export type ProductCategory = Tables<"product_categories">;
export type CreateProductCategoryData = TablesInsert<"product_categories">;
export type UpdateProductCategoryData = TablesUpdate<"product_categories">;

export function useProductCategories() {
  return useQuery({
    queryKey: ["product-categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_categories")
        .select("*")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data as ProductCategory[];
    },
  });
}

export function useCreateProductCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateProductCategoryData) => {
      const { data: created, error } = await supabase
        .from("product_categories")
        .insert(data)
        .select()
        .single();
      if (error) throw error;
      return created;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product-categories"] });
      toast.success("Categorie aangemaakt");
    },
    onError: () => {
      toast.error("Fout bij het aanmaken van categorie");
    },
  });
}

export function useUpdateProductCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateProductCategoryData }) => {
      const { error } = await supabase.from("product_categories").update(data).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product-categories"] });
      toast.success("Categorie bijgewerkt");
    },
    onError: () => {
      toast.error("Fout bij het bijwerken van categorie");
    },
  });
}

export function useDeleteProductCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("product_categories").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product-categories"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success("Categorie verwijderd");
    },
    onError: () => {
      toast.error("Fout bij het verwijderen van categorie");
    },
  });
}
