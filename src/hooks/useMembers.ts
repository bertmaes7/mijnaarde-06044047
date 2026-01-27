import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase, Member } from "@/lib/supabase";
import { toast } from "sonner";

export function useMembers(search?: string) {
  return useQuery({
    queryKey: ["members", search],
    queryFn: async () => {
      let query = supabase
        .from("members")
        .select(`
          *,
          company:companies(*)
        `)
        .order("last_name", { ascending: true });

      if (search) {
        query = query.or(
          `first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%`
        );
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Member[];
    },
  });
}

export function useMember(id: string | undefined) {
  return useQuery({
    queryKey: ["member", id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("members")
        .select(`
          *,
          company:companies(*)
        `)
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data as Member | null;
    },
    enabled: !!id,
  });
}

export function useUpdateMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: Partial<Omit<Member, "id" | "created_at" | "updated_at" | "company">>;
    }) => {
      const { error } = await supabase
        .from("members")
        .update(data)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["members"] });
      queryClient.invalidateQueries({ queryKey: ["member"] });
      toast.success("Lid succesvol bijgewerkt");
    },
    onError: () => {
      toast.error("Fout bij het bijwerken van lid");
    },
  });
}

export function useCreateMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      data: Omit<Member, "id" | "created_at" | "updated_at" | "company">
    ) => {
      const { data: newMember, error } = await supabase
        .from("members")
        .insert(data)
        .select()
        .single();
      if (error) throw error;
      return newMember;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["members"] });
      toast.success("Nieuw lid aangemaakt");
    },
    onError: () => {
      toast.error("Fout bij het aanmaken van lid");
    },
  });
}

export function useDeleteMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("members").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["members"] });
      toast.success("Lid verwijderd");
    },
    onError: () => {
      toast.error("Fout bij het verwijderen van lid");
    },
  });
}
