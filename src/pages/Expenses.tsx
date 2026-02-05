import { useState, useMemo } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { OrganizationLogo } from "@/components/layout/OrganizationLogo";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useExpenses, useCreateExpense, useUpdateExpense, useDeleteExpense, uploadReceipt } from "@/hooks/useFinance";
import { useMembers } from "@/hooks/useMembers";
import { useCompanies } from "@/hooks/useCompanies";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { ReceiptLink } from "@/components/finance/ReceiptLink";
import {
  ArrowLeft,
  Plus,
  TrendingDown,
  Trash2,
  Pencil,
  User,
  Building2,
} from "lucide-react";
import { Expense as ExpenseType } from "@/lib/supabase";
import { ExpenseFormDialog, ExpenseFormData } from "@/components/finance/ExpenseFormDialog";
import {
  FinanceFilters,
  FinanceFiltersState,
  getDefaultFilters,
  filterByPeriod,
  exportToCsv,
} from "@/components/finance/FinanceFilters";

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("nl-BE", {
    style: "currency",
    currency: "EUR",
  }).format(amount);
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString("nl-BE");
};

const expenseTypeOptions = [
  { value: "invoice", label: "Factuur" },
  { value: "expense_claim", label: "Onkostendeclaratie" },
  { value: "other", label: "Overig" },
];

const expenseCategoryLabels: Record<string, string> = {
  bankkosten: "Bankkosten",
  kantoormateriaal: "Kantoormateriaal",
  verzekeringen: "Verzekeringen",
  huur: "Huur",
  nutsvoorzieningen: "Nutsvoorzieningen",
  reiskosten: "Reiskosten",
  representatiekosten: "Representatiekosten",
  abonnementen: "Abonnementen",
  professionele_diensten: "Professionele diensten",
  overig: "Overig",
};

export default function Expenses() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<ExpenseType | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [filters, setFilters] = useState<FinanceFiltersState>(getDefaultFilters());

  const { data: expenses = [], isLoading } = useExpenses();
  const { data: members = [] } = useMembers("");
  const { data: companies = [] } = useCompanies();
  const createExpense = useCreateExpense();
  const updateExpense = useUpdateExpense();
  const deleteExpense = useDeleteExpense();

  const filteredExpenses = useMemo(() => {
    return filterByPeriod(expenses, filters);
  }, [expenses, filters]);

  const totalExpenses = filteredExpenses.reduce((sum, e) => sum + Number(e.amount), 0);

  const handleSubmit = async (data: ExpenseFormData, receiptFile: File | null) => {
    setIsUploading(true);
    try {
      const expenseData: any = {
        description: data.description,
        amount: parseFloat(data.amount),
        date: data.date,
        type: data.type,
        category: data.category,
        vat_rate: parseFloat(data.vat_rate),
        member_id: data.member_id && data.member_id !== "none" ? data.member_id : null,
        company_id: data.company_id && data.company_id !== "none" ? data.company_id : null,
        notes: data.notes || null,
      };

      // Handle receipt upload
      if (receiptFile) {
        const tempId = editingExpense?.id || crypto.randomUUID();
        const receiptUrl = await uploadReceipt(receiptFile, tempId);
        if (receiptUrl) {
          expenseData.receipt_url = receiptUrl;
        }
      }

      if (editingExpense) {
        await updateExpense.mutateAsync({ id: editingExpense.id, data: expenseData });
      } else {
        await createExpense.mutateAsync(expenseData);
      }
      setIsDialogOpen(false);
      setEditingExpense(null);
    } finally {
      setIsUploading(false);
    }
  };

  const handleEdit = (item: ExpenseType) => {
    setEditingExpense(item);
    setIsDialogOpen(true);
  };

  const handleAddNew = () => {
    setEditingExpense(null);
    setIsDialogOpen(true);
  };

  const handleExport = () => {
    const columns = [
      { key: "date", header: "Datum", format: (val: string) => formatDate(val) },
      { key: "description", header: "Omschrijving" },
      {
        key: "type",
        header: "Type",
        format: (val: string) =>
          val === "invoice" ? "Factuur" : val === "expense_claim" ? "Onkostendeclaratie" : "Overig",
      },
      {
        key: "category",
        header: "Categorie",
        format: (val: string) => expenseCategoryLabels[val] || val || "Overig",
      },
      { key: "vat_rate", header: "BTW %", format: (val: number) => `${val}%` },
      {
        key: "member",
        header: "Lid",
        format: (_: any, row: ExpenseType) =>
          row.member ? `${row.member.first_name} ${row.member.last_name}` : "",
      },
      {
        key: "company",
        header: "Bedrijf",
        format: (_: any, row: ExpenseType) => row.company?.name || "",
      },
      {
        key: "amount",
        header: "Bedrag",
        format: (val: number) => val.toFixed(2).replace(".", ","),
      },
      { key: "notes", header: "Notities" },
    ];
    exportToCsv(filteredExpenses, columns, "uitgaven");
    toast.success("Export gedownload");
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <Button asChild variant="ghost" size="icon">
              <Link to="/finance">
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </Button>
            <OrganizationLogo size="lg" className="hidden sm:flex rounded-lg border bg-white p-1" />
            <div>
              <h1 className="font-display text-3xl font-bold text-foreground">
                Uitgaven
              </h1>
              <p className="mt-1 text-muted-foreground">
                Gefilterd totaal: {formatCurrency(totalExpenses)}
              </p>
            </div>
          </div>
          <Button onClick={handleAddNew} className="gap-2">
            <Plus className="h-4 w-4" />
            Nieuwe uitgave
          </Button>
        </div>

        {/* Filters */}
        <FinanceFilters
          filters={filters}
          onFiltersChange={setFilters}
          onExport={handleExport}
          typeOptions={expenseTypeOptions}
        />

        {/* Expenses Table */}
        <Card className="card-elevated">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <TrendingDown className="h-5 w-5 text-primary" />
              Uitgaven ({filteredExpenses.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              </div>
            ) : filteredExpenses.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                Geen uitgaven gevonden
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Datum</TableHead>
                    <TableHead>Omschrijving</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Categorie</TableHead>
                    <TableHead>BTW</TableHead>
                    <TableHead>Gekoppeld aan</TableHead>
                    <TableHead>Bonnetje</TableHead>
                    <TableHead className="text-right">Bedrag</TableHead>
                    <TableHead className="w-[100px]">Acties</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredExpenses.map((expense) => (
                    <TableRow key={expense.id} className="hover:bg-muted/30">
                      <TableCell>{formatDate(expense.date)}</TableCell>
                      <TableCell className="font-medium">{expense.description}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {expense.type === "invoice"
                            ? "Factuur"
                            : expense.type === "expense_claim"
                            ? "Onkosten"
                            : "Overig"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {expenseCategoryLabels[(expense as any).category] || "Overig"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{expense.vat_rate}%</Badge>
                      </TableCell>
                      <TableCell>
                        {expense.member ? (
                          <span className="flex items-center gap-1.5">
                            <User className="h-3.5 w-3.5" />
                            {expense.member.first_name} {expense.member.last_name}
                          </span>
                        ) : expense.company ? (
                          <span className="flex items-center gap-1.5">
                            <Building2 className="h-3.5 w-3.5" />
                            {expense.company.name}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <ReceiptLink receiptUrl={expense.receipt_url} />
                      </TableCell>
                      <TableCell className="text-right font-medium text-red-600">
                        {formatCurrency(Number(expense.amount))}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(expense)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Uitgave verwijderen?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Weet je zeker dat je deze uitgave wilt verwijderen? Dit kan niet
                                  ongedaan worden gemaakt.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Annuleren</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => deleteExpense.mutate(expense.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Verwijderen
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Form Dialog */}
        <ExpenseFormDialog
          open={isDialogOpen}
          onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) setEditingExpense(null);
          }}
          onSubmit={handleSubmit}
          isPending={createExpense.isPending || updateExpense.isPending || isUploading}
          members={members}
          companies={companies}
          editingExpense={editingExpense}
        />
      </div>
    </MainLayout>
  );
}
