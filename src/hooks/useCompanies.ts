import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase, Company } from "@/lib/supabase";
import { toast } from "sonner";

export function useCompanies() {
  return useQuery({
    queryKey: ["companies"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("companies")
        .select("*")
        .order("name", { ascending: true });
      if (error) throw error;
      return data as Company[];
    },
  });
}

export function useCompany(id: string | undefined) {
  return useQuery({
    queryKey: ["company", id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("companies")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data as Company | null;
    },
    enabled: !!id,
  });
}

export function useCreateCompany() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      data: Omit<Company, "id" | "created_at" | "updated_at">
    ) => {
      const { data: newCompany, error } = await supabase
        .from("companies")
        .insert(data)
        .select()
        .single();
      if (error) throw error;
      return newCompany;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["companies"] });
      toast.success("Nieuw bedrijf aangemaakt");
    },
    onError: () => {
      toast.error("Fout bij het aanmaken van bedrijf");
    },
  });
}

export function useUpdateCompany() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: Partial<Omit<Company, "id" | "created_at" | "updated_at">>;
    }) => {
      const { error } = await supabase
        .from("companies")
        .update(data)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["companies"] });
      queryClient.invalidateQueries({ queryKey: ["company"] });
      toast.success("Bedrijf succesvol bijgewerkt");
    },
    onError: () => {
      toast.error("Fout bij het bijwerken van bedrijf");
    },
  });
}

export function useDeleteCompany() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("companies").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["companies"] });
      toast.success("Bedrijf succesvol verwijderd");
    },
    onError: () => {
      toast.error("Fout bij het verwijderen van bedrijf");
    },
  });
}
