import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase, Income, Expense } from "@/lib/supabase";
import { toast } from "sonner";

// Income hooks
export function useIncome() {
  return useQuery({
    queryKey: ["income"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("income")
        .select(`
          *,
          member:members(id, first_name, last_name),
          company:companies(id, name)
        `)
        .order("date", { ascending: false });
      if (error) throw error;
      return data as Income[];
    },
  });
}

export function useCreateIncome() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Omit<Income, "id" | "created_at" | "updated_at" | "member" | "company">) => {
      const { data: newIncome, error } = await supabase
        .from("income")
        .insert(data)
        .select()
        .single();
      if (error) throw error;
      return newIncome;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["income"] });
      toast.success("Inkomst toegevoegd");
    },
    onError: () => {
      toast.error("Fout bij toevoegen van inkomst");
    },
  });
}

export function useUpdateIncome() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Omit<Income, "id" | "created_at" | "updated_at" | "member" | "company">> }) => {
      const { error } = await supabase
        .from("income")
        .update(data)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["income"] });
      toast.success("Inkomst bijgewerkt");
    },
    onError: () => {
      toast.error("Fout bij bijwerken van inkomst");
    },
  });
}

export function useDeleteIncome() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("income").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["income"] });
      toast.success("Inkomst verwijderd");
    },
    onError: () => {
      toast.error("Fout bij verwijderen van inkomst");
    },
  });
}

// Expense hooks
export function useExpenses() {
  return useQuery({
    queryKey: ["expenses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("expenses")
        .select(`
          *,
          member:members(id, first_name, last_name),
          company:companies(id, name)
        `)
        .order("date", { ascending: false });
      if (error) throw error;
      return data as Expense[];
    },
  });
}

export function useCreateExpense() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Omit<Expense, "id" | "created_at" | "updated_at" | "member" | "company">) => {
      const { data: newExpense, error } = await supabase
        .from("expenses")
        .insert(data)
        .select()
        .single();
      if (error) throw error;
      return newExpense;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      toast.success("Uitgave toegevoegd");
    },
    onError: () => {
      toast.error("Fout bij toevoegen van uitgave");
    },
  });
}

export function useUpdateExpense() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Omit<Expense, "id" | "created_at" | "updated_at" | "member" | "company">> }) => {
      const { error } = await supabase
        .from("expenses")
        .update(data)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      toast.success("Uitgave bijgewerkt");
    },
    onError: () => {
      toast.error("Fout bij bijwerken van uitgave");
    },
  });
}

export function useDeleteExpense() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("expenses").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      toast.success("Uitgave verwijderd");
    },
    onError: () => {
      toast.error("Fout bij verwijderen van uitgave");
    },
  });
}

// Upload receipt
export async function uploadReceipt(file: File, expenseId: string): Promise<string | null> {
  const fileExt = file.name.split('.').pop();
  const fileName = `${expenseId}-${Date.now()}.${fileExt}`;
  const filePath = `${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from('receipts')
    .upload(filePath, file);

  if (uploadError) {
    toast.error("Fout bij uploaden van bonnetje");
    return null;
  }

  const { data } = supabase.storage.from('receipts').getPublicUrl(filePath);
  return data.publicUrl;
}
