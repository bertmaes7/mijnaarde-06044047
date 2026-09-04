import { useMemo, useState } from "react";
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
import { useDonations } from "@/hooks/useFinance";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft, Heart, User } from "lucide-react";
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

const statusOptions = [
  { value: "paid", label: "Betaald" },
  { value: "pending", label: "In behandeling" },
  { value: "failed", label: "Mislukt" },
];

const statusLabels: Record<string, { label: string; variant: "default" | "secondary" | "destructive" }> = {
  paid: { label: "Betaald", variant: "default" },
  pending: { label: "In behandeling", variant: "secondary" },
  failed: { label: "Mislukt", variant: "destructive" },
};

export default function Donations() {
  const [filters, setFilters] = useState<FinanceFiltersState>(getDefaultFilters());
  const { data: donations = [], isLoading } = useDonations();

  // filterByPeriod needs a `.date`; donations use paid_at (fallback created_at) and
  // `status` in place of the generic `type` filter slot.
  const donationsForFilter = useMemo(
    () =>
      donations.map((d) => ({
        ...d,
        date: d.paid_at ?? d.created_at,
        type: d.status,
      })),
    [donations]
  );

  const filteredDonations = useMemo(
    () => filterByPeriod(donationsForFilter, filters),
    [donationsForFilter, filters]
  );

  const totalPaid = filteredDonations
    .filter((d) => d.status === "paid")
    .reduce((sum, d) => sum + Number(d.amount), 0);

  const handleExport = () => {
    const columns = [
      { key: "date", header: "Datum", format: (val: string) => formatDate(val) },
      {
        key: "member",
        header: "Donor",
        format: (_: any, row: (typeof filteredDonations)[number]) =>
          row.member ? `${row.member.first_name} ${row.member.last_name}` : "",
      },
      {
        key: "email",
        header: "E-mail",
        format: (_: any, row: (typeof filteredDonations)[number]) => row.member?.email || "",
      },
      { key: "description", header: "Omschrijving" },
      {
        key: "status",
        header: "Status",
        format: (val: string) => statusLabels[val]?.label || val,
      },
      {
        key: "amount",
        header: "Bedrag",
        format: (val: number) => val.toFixed(2).replace(".", ","),
      },
    ];
    exportToCsv(filteredDonations, columns, "donaties");
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
                Donaties
              </h1>
              <p className="mt-1 text-muted-foreground">
                Totaal betaald (gefilterd): {formatCurrency(totalPaid)}
              </p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <FinanceFilters
          filters={filters}
          onFiltersChange={setFilters}
          onExport={handleExport}
          typeOptions={statusOptions}
          typeLabel="Status"
        />

        {/* Donations Table */}
        <Card className="card-elevated">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Heart className="h-5 w-5 text-primary" />
              Donaties ({filteredDonations.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              </div>
            ) : filteredDonations.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                Geen donaties gevonden
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Datum</TableHead>
                    <TableHead>Donor</TableHead>
                    <TableHead>Omschrijving</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Bedrag</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDonations.map((item) => {
                    const status = statusLabels[item.status] || { label: item.status, variant: "secondary" as const };
                    return (
                      <TableRow key={item.id} className="hover:bg-muted/30">
                        <TableCell>{formatDate(item.date)}</TableCell>
                        <TableCell className="font-medium">
                          {item.member ? (
                            <span className="flex flex-col">
                              <span className="flex items-center gap-1.5">
                                <User className="h-3.5 w-3.5" />
                                {item.member.first_name} {item.member.last_name}
                              </span>
                              {item.member.email && (
                                <span className="text-xs text-muted-foreground">{item.member.email}</span>
                              )}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>{item.description || "-"}</TableCell>
                        <TableCell>
                          <Badge variant={status.variant}>{status.label}</Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium text-green-600">
                          {formatCurrency(Number(item.amount))}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
