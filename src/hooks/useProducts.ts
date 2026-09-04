import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

export type ProductImage = Tables<"product_images">;

export type ProductCategoryRef = Pick<Tables<"product_categories">, "id" | "name" | "slug">;

export type Product = Tables<"products"> & {
  category?: ProductCategoryRef | null;
  product_images?: ProductImage[];
};

export type CreateProductData = TablesInsert<"products">;
export type UpdateProductData = Omit<TablesUpdate<"products">, "stock_quantity">;

const PRODUCT_SELECT = `
  *,
  category:product_categories(id, name, slug),
  product_images(*)
`;

export function getProductImageUrl(storagePath: string): string {
  return supabase.storage.from("product-images").getPublicUrl(storagePath).data.publicUrl;
}

export function useProducts() {
  return useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select(PRODUCT_SELECT)
        .order("name", { ascending: true });
      if (error) throw error;
      return data as unknown as Product[];
    },
  });
}

export function useProduct(id: string | undefined) {
  return useQuery({
    queryKey: ["product", id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("products")
        .select(PRODUCT_SELECT)
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as Product | null;
    },
    enabled: !!id,
  });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateProductData) => {
      const { data: created, error } = await supabase
        .from("products")
        .insert(data)
        .select()
        .single();
      if (error) throw error;
      return created;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success("Product aangemaakt");
    },
    onError: () => {
      toast.error("Fout bij het aanmaken van product");
    },
  });
}

export function useUpdateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateProductData }) => {
      const { error } = await supabase.from("products").update(data).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["product"] });
      toast.success("Product bijgewerkt");
    },
    onError: () => {
      toast.error("Fout bij het bijwerken van product");
    },
  });
}

export function useDeleteProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("products").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success("Product verwijderd");
    },
    onError: () => {
      toast.error("Fout bij het verwijderen van product");
    },
  });
}

export function useUploadProductImage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      productId,
      file,
      altText,
    }: {
      productId: string;
      file: File;
      altText?: string;
    }) => {
      const { count, error: countError } = await supabase
        .from("product_images")
        .select("id", { count: "exact", head: true })
        .eq("product_id", productId);
      if (countError) throw countError;

      const fileExt = file.name.split(".").pop();
      const filePath = `${productId}/${crypto.randomUUID()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("product-images")
        .upload(filePath, file);
      if (uploadError) throw uploadError;

      const { error: insertError } = await supabase.from("product_images").insert({
        product_id: productId,
        storage_path: filePath,
        alt_text: altText || null,
        is_primary: (count ?? 0) === 0,
      });
      if (insertError) throw insertError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["product"] });
      toast.success("Afbeelding geüpload");
    },
    onError: () => {
      toast.error("Fout bij het uploaden van afbeelding");
    },
  });
}

export function useDeleteProductImage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (image: Pick<ProductImage, "id" | "storage_path">) => {
      const { error: storageError } = await supabase.storage
        .from("product-images")
        .remove([image.storage_path]);
      if (storageError) throw storageError;

      const { error } = await supabase.from("product_images").delete().eq("id", image.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["product"] });
      toast.success("Afbeelding verwijderd");
    },
    onError: () => {
      toast.error("Fout bij het verwijderen van afbeelding");
    },
  });
}

export function useSetPrimaryProductImage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ productId, imageId }: { productId: string; imageId: string }) => {
      const { error: clearError } = await supabase
        .from("product_images")
        .update({ is_primary: false })
        .eq("product_id", productId);
      if (clearError) throw clearError;

      const { error } = await supabase
        .from("product_images")
        .update({ is_primary: true })
        .eq("id", imageId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["product"] });
      toast.success("Hoofdafbeelding ingesteld");
    },
    onError: () => {
      toast.error("Fout bij het instellen van hoofdafbeelding");
    },
  });
}
