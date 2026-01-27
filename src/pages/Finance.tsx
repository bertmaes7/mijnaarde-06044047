import { useMemo } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
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

  const stats = useMemo(() => {
    const totalIncome = income.reduce((sum, i) => sum + Number(i.amount), 0);
    const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
    const balance = totalIncome - totalExpenses;

    const membershipIncome = income
      .filter((i) => i.type === "membership")
      .reduce((sum, i) => sum + Number(i.amount), 0);
    const donationIncome = income
      .filter((i) => i.type === "donation")
      .reduce((sum, i) => sum + Number(i.amount), 0);

    return {
      totalIncome,
      totalExpenses,
      balance,
      membershipIncome,
      donationIncome,
    };
  }, [income, expenses]);

  // Combine and sort all transactions for bank overview
  const allTransactions = useMemo(() => {
    const incomeTransactions = income.map((i) => ({
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

    const expenseTransactions = expenses.map((e) => ({
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
  }, [income, expenses]);

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
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold text-foreground">
              Financieel Dashboard
            </h1>
            <p className="mt-1 text-muted-foreground">
              Overzicht van inkomsten, uitgaven en saldo
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
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
          </div>
        </div>

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
                {income.length} transacties
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
                {expenses.length} transacties
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

        {/* Bank Overview */}
        <Card className="card-elevated">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Receipt className="h-5 w-5 text-primary" />
              Bankoverzicht - Recente Transacties
            </CardTitle>
          </CardHeader>
          <CardContent>
            {allTransactions.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                Nog geen transacties geregistreerd
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
