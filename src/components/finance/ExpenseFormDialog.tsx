import { useEffect, useMemo, useRef, useState } from "react";
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
import { TrendingDown, Upload, Trash2 } from "lucide-react";
import { Expense } from "@/lib/supabase";
import { toast } from "sonner";
import { SearchableSelect } from "./SearchableSelect";

const EXPENSE_CATEGORIES = [
  { value: "bankkosten", label: "Bankkosten" },
  { value: "kantoormateriaal", label: "Kantoormateriaal" },
  { value: "verzekeringen", label: "Verzekeringen" },
  { value: "huur", label: "Huur" },
  { value: "nutsvoorzieningen", label: "Nutsvoorzieningen" },
  { value: "reiskosten", label: "Reiskosten" },
  { value: "representatiekosten", label: "Representatiekosten" },
  { value: "abonnementen", label: "Abonnementen" },
  { value: "professionele_diensten", label: "Professionele diensten" },
  { value: "overig", label: "Overig" },
] as const;

const expenseSchema = z.object({
  description: z.string().min(1, "Omschrijving is verplicht"),
  amount: z.string().min(1, "Bedrag is verplicht"),
  date: z.string().min(1, "Datum is verplicht"),
  type: z.enum(["invoice", "expense_claim", "other"]),
  category: z.string().default("overig"),
  vat_rate: z.string().default("21"),
  member_id: z.string().optional(),
  company_id: z.string().optional(),
  notes: z.string().optional(),
});

export type ExpenseFormData = z.infer<typeof expenseSchema>;

interface ExpenseFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: ExpenseFormData, receiptFile: File | null) => Promise<void>;
  isPending: boolean;
  members: { id: string; first_name: string; last_name: string }[];
  companies: { id: string; name: string }[];
  editingExpense?: Expense | null;
}

export function ExpenseFormDialog({
  open,
  onOpenChange,
  onSubmit,
  isPending,
  members,
  companies,
  editingExpense,
}: ExpenseFormDialogProps) {
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<ExpenseFormData>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      description: "",
      amount: "",
      date: new Date().toISOString().split("T")[0],
      type: "invoice",
      category: "overig",
      vat_rate: "21",
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
    if (editingExpense) {
      form.reset({
        description: editingExpense.description,
        amount: String(editingExpense.amount),
        date: editingExpense.date,
        type: editingExpense.type as "invoice" | "expense_claim" | "other",
        category: (editingExpense as any).category || "overig",
        vat_rate: String(editingExpense.vat_rate),
        member_id: editingExpense.member_id || "",
        company_id: editingExpense.company_id || "",
        notes: editingExpense.notes || "",
      });
    } else {
      form.reset({
        description: "",
        amount: "",
        date: new Date().toISOString().split("T")[0],
        type: "invoice",
        category: "overig",
        vat_rate: "21",
        member_id: "",
        company_id: "",
        notes: "",
      });
    }
    setReceiptFile(null);
  }, [editingExpense, form, open]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
      if (!allowedTypes.includes(file.type)) {
        toast.error("Alleen JPG, PNG, WebP of PDF bestanden zijn toegestaan");
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast.error("Bestand mag maximaal 10MB zijn");
        return;
      }
      setReceiptFile(file);
    }
  };

  const handleSubmit = async (data: ExpenseFormData) => {
    await onSubmit(data, receiptFile);
    form.reset();
    setReceiptFile(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2">
            <TrendingDown className="h-5 w-5 text-primary" />
            {editingExpense ? "Uitgave bewerken" : "Nieuwe uitgave toevoegen"}
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
                    <Input placeholder="Factuur kantoormateriaal" {...field} />
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
                      <Input type="number" step="0.01" placeholder="50.00" {...field} />
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
            <div className="grid gap-4 sm:grid-cols-2">
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
                        <SelectItem value="invoice">Factuur</SelectItem>
                        <SelectItem value="expense_claim">Onkostendeclaratie</SelectItem>
                        <SelectItem value="other">Overig</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Categorie</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {EXPENSE_CATEGORIES.map((cat) => (
                          <SelectItem key={cat.value} value={cat.value}>
                            {cat.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="vat_rate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>BTW-tarief</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="0">0%</SelectItem>
                        <SelectItem value="6">6%</SelectItem>
                        <SelectItem value="12">12%</SelectItem>
                        <SelectItem value="21">21%</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
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

            {/* Receipt Upload */}
            <div className="space-y-2">
              <FormLabel>Bonnetje/Factuur {editingExpense?.receipt_url ? "(nieuw uploaden vervangt bestaand)" : "(optioneel)"}</FormLabel>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".jpg,.jpeg,.png,.webp,.pdf"
                className="hidden"
              />
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  className="gap-2 flex-1"
                >
                  <Upload className="h-4 w-4" />
                  {receiptFile ? receiptFile.name : "Upload bestand"}
                </Button>
                {receiptFile && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setReceiptFile(null)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                JPG, PNG, WebP of PDF (max 10MB)
              </p>
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
