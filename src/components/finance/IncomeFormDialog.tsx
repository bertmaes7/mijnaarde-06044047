import { useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { TrendingUp } from "lucide-react";
import { Income } from "@/lib/supabase";
import { SearchableSelect } from "./SearchableSelect";

const incomeSchema = z.object({
  description: z.string().min(1, "Omschrijving is verplicht"),
  amount: z.string().min(1, "Bedrag is verplicht"),
  date: z.string().min(1, "Datum is verplicht"),
  type: z.enum(["membership", "donation", "other"]),
  member_id: z.string().optional(),
  company_id: z.string().optional(),
  notes: z.string().optional(),
});

export type IncomeFormData = z.infer<typeof incomeSchema>;

interface IncomeFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: IncomeFormData) => Promise<void>;
  isPending: boolean;
  members: { id: string; first_name: string; last_name: string }[];
  companies: { id: string; name: string }[];
  editingIncome?: Income | null;
}

export function IncomeFormDialog({
  open,
  onOpenChange,
  onSubmit,
  isPending,
  members,
  companies,
  editingIncome,
}: IncomeFormDialogProps) {
  const form = useForm<IncomeFormData>({
    resolver: zodResolver(incomeSchema),
    defaultValues: {
      description: "",
      amount: "",
      date: new Date().toISOString().split("T")[0],
      type: "membership",
      member_id: "",
      company_id: "",
      notes: "",
    },
  });

  const memberOptions = useMemo(
    () =>
      members.map((member) => ({
        value: member.id,
        label: `${member.first_name} ${member.last_name}`,
      })),
    [members]
  );

  const companyOptions = useMemo(
    () =>
      companies.map((company) => ({
        value: company.id,
        label: company.name,
      })),
    [companies]
  );

  useEffect(() => {
    if (editingIncome) {
      form.reset({
        description: editingIncome.description,
        amount: String(editingIncome.amount),
        date: editingIncome.date,
        type: editingIncome.type as "membership" | "donation" | "other",
        member_id: editingIncome.member_id || "",
        company_id: editingIncome.company_id || "",
        notes: editingIncome.notes || "",
      });
    } else {
      form.reset({
        description: "",
        amount: "",
        date: new Date().toISOString().split("T")[0],
        type: "membership",
        member_id: "",
        company_id: "",
        notes: "",
      });
    }
  }, [editingIncome, form, open]);

  const handleSubmit = async (data: IncomeFormData) => {
    await onSubmit(data);
    form.reset();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            {editingIncome ? "Inkomst bewerken" : "Nieuwe inkomst toevoegen"}
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Omschrijving *</FormLabel>
                  <FormControl>
                    <Input placeholder="Lidgeld 2024" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bedrag (€) *</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" placeholder="100.00" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Datum *</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Type</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="membership">Lidmaatschapsgeld</SelectItem>
                      <SelectItem value="donation">Donatie</SelectItem>
                      <SelectItem value="other">Overig</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="member_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Gekoppeld lid</FormLabel>
                    <FormControl>
                      <SearchableSelect
                        options={memberOptions}
                        value={field.value || "none"}
                        onValueChange={field.onChange}
                        placeholder="Selecteer lid"
                        searchPlaceholder="Zoek lid..."
                        emptyText="Geen leden gevonden."
                        noneLabel="Geen lid"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="company_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Gekoppeld bedrijf</FormLabel>
                    <FormControl>
                      <SearchableSelect
                        options={companyOptions}
                        value={field.value || "none"}
                        onValueChange={field.onChange}
                        placeholder="Selecteer bedrijf"
                        searchPlaceholder="Zoek bedrijf..."
                        emptyText="Geen bedrijven gevonden."
                        noneLabel="Geen bedrijf"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notities</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Optionele notities..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Annuleren
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Opslaan..." : "Opslaan"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
