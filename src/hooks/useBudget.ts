import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type BudgetSection = "income" | "expenses" | "assets" | "liabilities";

export type BudgetItem = {
  id: string;
  fiscal_year: number;
  section: BudgetSection;
  category: string;
  description: string;
  budgeted_amount: number;
  realized_amount: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export const BUDGET_CATEGORIES = {
  income: [
    { value: "lidgeld", label: "Lidgeld" },
    { value: "schenkingen", label: "Schenkingen en Legaten" },
    { value: "subsidies", label: "Subsidies" },
    { value: "andere_ontvangsten", label: "Andere ontvangsten" },
  ],
  expenses: [
    { value: "goederen_diensten", label: "Goederen en diensten" },
    { value: "bezoldigingen", label: "Bezoldigingen" },
    { value: "diensten_diverse", label: "Diensten en diverse goederen" },
    { value: "andere_uitgaven", label: "Andere uitgaven" },
  ],
};

export function useBudget(fiscalYear: number) {
  return useQuery({
    queryKey: ["budget", fiscalYear],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("budget")
        .select("*")
        .eq("fiscal_year", fiscalYear)
        .order("section")
        .order("category");
      if (error) throw error;
      return data as BudgetItem[];
    },
  });
}

export function useUpsertBudgetItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (item: {
      id?: string;
      fiscal_year: number;
      section: BudgetSection;
      category: string;
      description: string;
      budgeted_amount: number;
      realized_amount?: number;
      notes?: string | null;
    }) => {
      if (item.id) {
        // Update existing
        const { error } = await supabase
          .from("budget")
          .update({
            budgeted_amount: item.budgeted_amount,
            realized_amount: item.realized_amount ?? 0,
            notes: item.notes,
          })
          .eq("id", item.id);
        if (error) throw error;
      } else {
        // Insert new
        const { error } = await supabase
          .from("budget")
          .insert({
            fiscal_year: item.fiscal_year,
            section: item.section,
            category: item.category,
            description: item.description,
            budgeted_amount: item.budgeted_amount,
            realized_amount: item.realized_amount ?? 0,
            notes: item.notes,
          });
        if (error) throw error;
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["budget", variables.fiscal_year] });
    },
    onError: () => {
      toast.error("Fout bij opslaan van begrotingsregel");
    },
  });
}

export function useSaveBudget() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      fiscalYear,
      incomeItems,
      expenseItems,
      approvalDate,
      signatory,
    }: {
      fiscalYear: number;
      incomeItems: { category: string; amount: number }[];
      expenseItems: { category: string; amount: number }[];
      approvalDate?: string;
      signatory?: string;
    }) => {
      // Delete existing budget items for this fiscal year (income/expenses only)
      await supabase
        .from("budget")
        .delete()
        .eq("fiscal_year", fiscalYear)
        .in("section", ["income", "expenses"]);

      // Insert income items
      const incomeInserts = incomeItems
        .filter((item) => item.amount > 0)
        .map((item) => ({
          fiscal_year: fiscalYear,
          section: "income" as const,
          category: item.category,
          description: BUDGET_CATEGORIES.income.find((c) => c.value === item.category)?.label || item.category,
          budgeted_amount: item.amount,
          realized_amount: 0,
          notes: null,
        }));

      // Insert expense items
      const expenseInserts = expenseItems
        .filter((item) => item.amount > 0)
        .map((item) => ({
          fiscal_year: fiscalYear,
          section: "expenses" as const,
          category: item.category,
          description: BUDGET_CATEGORIES.expenses.find((c) => c.value === item.category)?.label || item.category,
          budgeted_amount: item.amount,
          realized_amount: 0,
          notes: null,
        }));

      const allInserts = [...incomeInserts, ...expenseInserts];
      
      if (allInserts.length > 0) {
        const { error } = await supabase.from("budget").insert(allInserts);
        if (error) throw error;
      }

      return { success: true };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["budget", variables.fiscalYear] });
      toast.success("Begroting opgeslagen");
    },
    onError: () => {
      toast.error("Fout bij opslaan van begroting");
    },
  });
}

export function useDeleteBudgetItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, fiscalYear }: { id: string; fiscalYear: number }) => {
      const { error } = await supabase.from("budget").delete().eq("id", id);
      if (error) throw error;
      return fiscalYear;
    },
    onSuccess: (fiscalYear) => {
      queryClient.invalidateQueries({ queryKey: ["budget", fiscalYear] });
      toast.success("Begrotingsregel verwijderd");
    },
    onError: () => {
      toast.error("Fout bij verwijderen van begrotingsregel");
    },
  });
}
