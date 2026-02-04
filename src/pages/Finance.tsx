import { useMemo, useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useIncome, useExpenses } from "@/hooks/useFinance";
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  PiggyBank,
  Receipt,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  DateRangeFilter,
  DateFilterType,
  QuarterOption,
  getQuarterDates,
} from "@/components/finance/DateRangeFilter";

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("nl-BE", {
    style: "currency",
    currency: "EUR",
  }).format(amount);
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString("nl-BE");
};

export default function Finance() {
  const { data: income = [], isLoading: incomeLoading } = useIncome();
  const { data: expenses = [], isLoading: expensesLoading } = useExpenses();

  // Date filter state
  const [filterType, setFilterType] = useState<DateFilterType>("all");
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedQuarter, setSelectedQuarter] = useState<QuarterOption>("Q1");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");

  const clearFilters = () => {
    setFilterType("all");
    setCustomStartDate("");
    setCustomEndDate("");
  };

  // Filter function for transactions
  const filterByDate = (dateString: string) => {
    if (filterType === "all") return true;

    const date = new Date(dateString);

    if (filterType === "quarter") {
      const { start, end } = getQuarterDates(selectedYear, selectedQuarter);
      return date >= start && date <= end;
    }

    if (filterType === "custom") {
      if (customStartDate && date < new Date(customStartDate)) return false;
      if (customEndDate && date > new Date(customEndDate)) return false;
      return true;
    }

    return true;
  };

  // Filtered data
  const filteredIncome = useMemo(
    () => income.filter((i) => filterByDate(i.date)),
    [income, filterType, selectedYear, selectedQuarter, customStartDate, customEndDate]
  );

  const filteredExpenses = useMemo(
    () => expenses.filter((e) => filterByDate(e.date)),
    [expenses, filterType, selectedYear, selectedQuarter, customStartDate, customEndDate]
  );

  const stats = useMemo(() => {
    const totalIncome = filteredIncome.reduce((sum, i) => sum + Number(i.amount), 0);
    const totalExpenses = filteredExpenses.reduce((sum, e) => sum + Number(e.amount), 0);
    const balance = totalIncome - totalExpenses;

    const membershipIncome = filteredIncome
      .filter((i) => i.type === "membership")
      .reduce((sum, i) => sum + Number(i.amount), 0);
    const donationIncome = filteredIncome
      .filter((i) => i.type === "donation")
      .reduce((sum, i) => sum + Number(i.amount), 0);

    // Calculate VAT totals for expenses
    const vatTotals = filteredExpenses.reduce(
      (acc, e) => {
        const amount = Number(e.amount);
        const vatRate = e.vat_rate || 21;
        const vatAmount = amount * (vatRate / (100 + vatRate));
        acc.totalVat += vatAmount;
        acc.byRate[vatRate] = (acc.byRate[vatRate] || 0) + vatAmount;
        return acc;
      },
      { totalVat: 0, byRate: {} as Record<number, number> }
    );

    return {
      totalIncome,
      totalExpenses,
      balance,
      membershipIncome,
      donationIncome,
      vatTotals,
    };
  }, [filteredIncome, filteredExpenses]);

  // Combine and sort all transactions for bank overview
  const allTransactions = useMemo(() => {
    const incomeTransactions = filteredIncome.map((i) => ({
      id: i.id,
      date: i.date,
      description: i.description,
      amount: Number(i.amount),
      type: "income" as const,
      category: i.type,
      linkedTo: i.member
        ? `${i.member.first_name} ${i.member.last_name}`
        : i.company?.name || null,
    }));

    const expenseTransactions = filteredExpenses.map((e) => ({
      id: e.id,
      date: e.date,
      description: e.description,
      amount: -Number(e.amount),
      type: "expense" as const,
      category: e.type,
      linkedTo: e.member
        ? `${e.member.first_name} ${e.member.last_name}`
        : e.company?.name || null,
    }));

    return [...incomeTransactions, ...expenseTransactions].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }, [filteredIncome, filteredExpenses]);

  const isLoading = incomeLoading || expensesLoading;

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <PageHeader
          title="Financieel Dashboard"
          description="Overzicht van inkomsten, uitgaven en saldo"
          actions={
            <>
              <Button asChild variant="outline" className="gap-2">
                <Link to="/finance/income">
                  <TrendingUp className="h-4 w-4" />
                  Inkomsten
                </Link>
              </Button>
              <Button asChild variant="outline" className="gap-2">
                <Link to="/finance/expenses">
                  <TrendingDown className="h-4 w-4" />
                  Uitgaven
                </Link>
              </Button>
              <Button asChild variant="secondary" className="gap-2">
                <Link to="/finance/annual-report">
                  <Receipt className="h-4 w-4" />
                  Jaarrekening
                </Link>
              </Button>
            </>
          }
        />

        {/* Date Filter */}
        <Card className="card-elevated">
          <CardContent className="pt-4">
            <DateRangeFilter
              filterType={filterType}
              setFilterType={setFilterType}
              selectedYear={selectedYear}
              setSelectedYear={setSelectedYear}
              selectedQuarter={selectedQuarter}
              setSelectedQuarter={setSelectedQuarter}
              customStartDate={customStartDate}
              setCustomStartDate={setCustomStartDate}
              customEndDate={customEndDate}
              setCustomEndDate={setCustomEndDate}
              onClear={clearFilters}
            />
          </CardContent>
        </Card>

        {/* Stats Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="card-elevated">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Totale Inkomsten
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(stats.totalIncome)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {filteredIncome.length} transacties
              </p>
            </CardContent>
          </Card>

          <Card className="card-elevated">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Totale Uitgaven
              </CardTitle>
              <TrendingDown className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {formatCurrency(stats.totalExpenses)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {filteredExpenses.length} transacties
              </p>
            </CardContent>
          </Card>

          <Card className="card-elevated">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Huidig Saldo
              </CardTitle>
              <Wallet className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div
                className={`text-2xl font-bold ${
                  stats.balance >= 0 ? "text-green-600" : "text-red-600"
                }`}
              >
                {formatCurrency(stats.balance)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Inkomsten - Uitgaven
              </p>
            </CardContent>
          </Card>

          <Card className="card-elevated">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Lidmaatschapsgelden
              </CardTitle>
              <PiggyBank className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(stats.membershipIncome)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Donaties: {formatCurrency(stats.donationIncome)}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* VAT Summary */}
        {filterType !== "all" && stats.vatTotals.totalVat > 0 && (
          <Card className="card-elevated border-primary/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                BTW Overzicht (Uitgaven)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-4">
                <div>
                  <span className="text-xs text-muted-foreground">Totaal BTW:</span>
                  <span className="ml-2 font-bold">{formatCurrency(stats.vatTotals.totalVat)}</span>
                </div>
                {Object.entries(stats.vatTotals.byRate).map(([rate, amount]) => (
                  <div key={rate}>
                    <Badge variant="outline" className="mr-2">{rate}%</Badge>
                    <span className="text-sm">{formatCurrency(amount)}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Bank Overview */}
        <Card className="card-elevated">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Receipt className="h-5 w-5 text-primary" />
              Bankoverzicht - Recente Transacties
              {filterType !== "all" && (
                <Badge variant="secondary" className="ml-2">
                  {filterType === "quarter"
                    ? `${selectedQuarter} ${selectedYear}`
                    : "Aangepaste periode"}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {allTransactions.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                {filterType === "all"
                  ? "Nog geen transacties geregistreerd"
                  : "Geen transacties in deze periode"}
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
                    <TableHead className="text-right">Lopend Saldo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allTransactions.slice(0, 20).map((transaction, index) => {
                    // Calculate running balance (from oldest to newest for this display)
                    const runningBalance = allTransactions
                      .slice(index)
                      .reduce((sum, t) => sum + t.amount, 0);

                    return (
                      <TableRow key={transaction.id} className="hover:bg-muted/30">
                        <TableCell>{formatDate(transaction.date)}</TableCell>
                        <TableCell className="font-medium">
                          {transaction.description}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              transaction.type === "income" ? "default" : "secondary"
                            }
                            className="gap-1"
                          >
                            {transaction.type === "income" ? (
                              <ArrowUpRight className="h-3 w-3" />
                            ) : (
                              <ArrowDownRight className="h-3 w-3" />
                            )}
                            {transaction.category === "membership"
                              ? "Lidgeld"
                              : transaction.category === "donation"
                              ? "Donatie"
                              : transaction.category === "invoice"
                              ? "Factuur"
                              : transaction.category === "expense_claim"
                              ? "Onkosten"
                              : "Overig"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {transaction.linkedTo || (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell
                          className={`text-right font-medium ${
                            transaction.amount >= 0
                              ? "text-green-600"
                              : "text-red-600"
                          }`}
                        >
                          {transaction.amount >= 0 ? "+" : ""}
                          {formatCurrency(transaction.amount)}
                        </TableCell>
                        <TableCell
                          className={`text-right font-medium ${
                            runningBalance >= 0 ? "text-green-600" : "text-red-600"
                          }`}
                        >
                          {formatCurrency(runningBalance)}
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
