import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type Contribution = {
  id: string;
  member_id: string;
  contribution_year: number;
  amount: number;
  status: "pending" | "paid" | "failed";
  mollie_payment_id: string | null;
  paid_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  member?: { id: string; first_name: string; last_name: string; email: string | null } | null;
};

export function useContributions(year?: number) {
  return useQuery({
    queryKey: ["contributions", year],
    queryFn: async () => {
      let query = supabase
        .from("contributions")
        .select(`
          *,
          member:members(id, first_name, last_name, email)
        `)
        .order("contribution_year", { ascending: false });

      if (year) {
        query = query.eq("contribution_year", year);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Contribution[];
    },
  });
}

export function useMyContributions() {
  return useQuery({
    queryKey: ["my-contributions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contributions")
        .select("*")
        .order("contribution_year", { ascending: false });
      if (error) throw error;
      return data as Contribution[];
    },
  });
}

export function useCreateContribution() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      member_id: string;
      contribution_year: number;
      amount: number;
      status?: string;
    }) => {
      const { data: newContribution, error } = await supabase
        .from("contributions")
        .insert(data)
        .select()
        .single();
      if (error) throw error;
      return newContribution;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contributions"] });
      toast.success("Lidgeld aangemaakt");
    },
    onError: (error: any) => {
      if (error.code === "23505") {
        toast.error("Lidgeld voor dit jaar bestaat al voor dit lid");
      } else {
        toast.error("Fout bij aanmaken lidgeld");
      }
    },
  });
}

export function useUpdateContribution() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Contribution> }) => {
      const { error } = await supabase
        .from("contributions")
        .update(data)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contributions"] });
      toast.success("Lidgeld bijgewerkt");
    },
    onError: () => {
      toast.error("Fout bij bijwerken lidgeld");
    },
  });
}

export function useDeleteContribution() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("contributions")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contributions"] });
      toast.success("Lidgeld verwijderd");
    },
    onError: () => {
      toast.error("Fout bij verwijderen lidgeld");
    },
  });
}

export function useContributionAmount() {
  return useQuery({
    queryKey: ["contribution-amount"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mailing_assets")
        .select("value")
        .eq("type", "organization")
        .eq("key", "org_contribution_amount")
        .maybeSingle();
      if (error) throw error;
      return data ? parseFloat(data.value) : 25;
    },
  });
}
