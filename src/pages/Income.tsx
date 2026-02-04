import { useState, useMemo } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
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
import { useIncome, useCreateIncome, useUpdateIncome, useDeleteIncome } from "@/hooks/useFinance";
import { useMembers } from "@/hooks/useMembers";
import { useCompanies } from "@/hooks/useCompanies";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import {
  ArrowLeft,
  Plus,
  TrendingUp,
  Trash2,
  Pencil,
  User,
  Building2,
} from "lucide-react";
import { Income as IncomeType } from "@/lib/supabase";
import { IncomeFormDialog, IncomeFormData } from "@/components/finance/IncomeFormDialog";
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

const incomeTypeOptions = [
  { value: "membership", label: "Lidmaatschapsgeld" },
  { value: "donation", label: "Donatie" },
  { value: "other", label: "Overig" },
];

export default function Income() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingIncome, setEditingIncome] = useState<IncomeType | null>(null);
  const [filters, setFilters] = useState<FinanceFiltersState>(getDefaultFilters());

  const { data: income = [], isLoading } = useIncome();
  const { data: members = [] } = useMembers("");
  const { data: companies = [] } = useCompanies();
  const createIncome = useCreateIncome();
  const updateIncome = useUpdateIncome();
  const deleteIncome = useDeleteIncome();

  const filteredIncome = useMemo(() => {
    return filterByPeriod(income, filters);
  }, [income, filters]);

  const totalIncome = filteredIncome.reduce((sum, i) => sum + Number(i.amount), 0);

  const handleSubmit = async (data: IncomeFormData) => {
    const incomeData = {
      description: data.description,
      amount: parseFloat(data.amount),
      date: data.date,
      type: data.type,
      member_id: data.member_id && data.member_id !== "none" ? data.member_id : null,
      company_id: data.company_id && data.company_id !== "none" ? data.company_id : null,
      notes: data.notes || null,
    };

    if (editingIncome) {
      await updateIncome.mutateAsync({ id: editingIncome.id, data: incomeData });
    } else {
      await createIncome.mutateAsync(incomeData);
    }
    setIsDialogOpen(false);
    setEditingIncome(null);
  };

  const handleEdit = (item: IncomeType) => {
    setEditingIncome(item);
    setIsDialogOpen(true);
  };

  const handleAddNew = () => {
    setEditingIncome(null);
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
          val === "membership" ? "Lidmaatschapsgeld" : val === "donation" ? "Donatie" : "Overig",
      },
      {
        key: "member",
        header: "Lid",
        format: (_: any, row: IncomeType) =>
          row.member ? `${row.member.first_name} ${row.member.last_name}` : "",
      },
      {
        key: "company",
        header: "Bedrijf",
        format: (_: any, row: IncomeType) => row.company?.name || "",
      },
      {
        key: "amount",
        header: "Bedrag",
        format: (val: number) => val.toFixed(2).replace(".", ","),
      },
      { key: "notes", header: "Notities" },
    ];
    exportToCsv(filteredIncome, columns, "inkomsten");
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
            <div>
              <h1 className="font-display text-3xl font-bold text-foreground">
                Inkomsten
              </h1>
              <p className="mt-1 text-muted-foreground">
                Gefilterd totaal: {formatCurrency(totalIncome)}
              </p>
            </div>
          </div>
          <Button onClick={handleAddNew} className="gap-2">
            <Plus className="h-4 w-4" />
            Nieuwe inkomst
          </Button>
        </div>

        {/* Filters */}
        <FinanceFilters
          filters={filters}
          onFiltersChange={setFilters}
          onExport={handleExport}
          typeOptions={incomeTypeOptions}
        />

        {/* Income Table */}
        <Card className="card-elevated">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <TrendingUp className="h-5 w-5 text-primary" />
              Inkomsten ({filteredIncome.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              </div>
            ) : filteredIncome.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                Geen inkomsten gevonden
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Datum</TableHead>
                    <TableHead>Omschrijving</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Gekoppeld aan</TableHead>
                    <TableHead className="text-right">Bedrag</TableHead>
                    <TableHead className="w-[100px]">Acties</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredIncome.map((item) => (
                    <TableRow key={item.id} className="hover:bg-muted/30">
                      <TableCell>{formatDate(item.date)}</TableCell>
                      <TableCell className="font-medium">{item.description}</TableCell>
                      <TableCell>
                        <Badge variant="default">
                          {item.type === "membership"
                            ? "Lidgeld"
                            : item.type === "donation"
                            ? "Donatie"
                            : "Overig"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {item.member ? (
                          <span className="flex items-center gap-1.5">
                            <User className="h-3.5 w-3.5" />
                            {item.member.first_name} {item.member.last_name}
                          </span>
                        ) : item.company ? (
                          <span className="flex items-center gap-1.5">
                            <Building2 className="h-3.5 w-3.5" />
                            {item.company.name}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-medium text-green-600">
                        {formatCurrency(Number(item.amount))}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(item)}
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
                                <AlertDialogTitle>Inkomst verwijderen?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Weet je zeker dat je deze inkomst wilt verwijderen? Dit kan niet
                                  ongedaan worden gemaakt.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Annuleren</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => deleteIncome.mutate(item.id)}
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
        <IncomeFormDialog
          open={isDialogOpen}
          onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) setEditingIncome(null);
          }}
          onSubmit={handleSubmit}
          isPending={createIncome.isPending || updateIncome.isPending}
          members={members}
          companies={companies}
          editingIncome={editingIncome}
        />
      </div>
    </MainLayout>
  );
}
