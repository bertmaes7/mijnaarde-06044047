import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { 
  Receipt, 
  FileText, 
  ArrowDownCircle, 
  Heart,
  Euro
} from "lucide-react";

interface MemberTransactionsProps {
  memberId: string;
}

interface Transaction {
  id: string;
  type: "income" | "expense" | "invoice" | "donation";
  date: string;
  description: string;
  amount: number;
  status?: string;
}

export function MemberTransactions({ memberId }: MemberTransactionsProps) {
  const { data: transactions, isLoading } = useQuery({
    queryKey: ["member-transactions", memberId],
    queryFn: async () => {
      const allTransactions: Transaction[] = [];

      // Fetch income
      const { data: income } = await supabase
        .from("income")
        .select("id, date, description, amount, type")
        .eq("member_id", memberId)
        .order("date", { ascending: false });

      if (income) {
        income.forEach((item) => {
          allTransactions.push({
            id: item.id,
            type: "income",
            date: item.date,
            description: item.description,
            amount: item.amount,
          });
        });
      }

      // Fetch expenses
      const { data: expenses } = await supabase
        .from("expenses")
        .select("id, date, description, amount, type")
        .eq("member_id", memberId)
        .order("date", { ascending: false });

      if (expenses) {
        expenses.forEach((item) => {
          allTransactions.push({
            id: item.id,
            type: "expense",
            date: item.date,
            description: item.description,
            amount: -item.amount, // Negative for expenses
          });
        });
      }

      // Fetch invoices
      const { data: invoices } = await supabase
        .from("invoices")
        .select("id, invoice_date, invoice_number, description, total, status")
        .eq("member_id", memberId)
        .order("invoice_date", { ascending: false });

      if (invoices) {
        invoices.forEach((item) => {
          allTransactions.push({
            id: item.id,
            type: "invoice",
            date: item.invoice_date,
            description: `Factuur ${item.invoice_number}: ${item.description}`,
            amount: item.total,
            status: item.status,
          });
        });
      }

      // Fetch donations
      const { data: donations } = await supabase
        .from("donations")
        .select("id, created_at, description, amount, status")
        .eq("member_id", memberId)
        .order("created_at", { ascending: false });

      if (donations) {
        donations.forEach((item) => {
          allTransactions.push({
            id: item.id,
            type: "donation",
            date: item.created_at.split("T")[0],
            description: item.description || "Donatie",
            amount: item.amount,
            status: item.status,
          });
        });
      }

      // Sort by date descending
      return allTransactions.sort((a, b) => 
        new Date(b.date).getTime() - new Date(a.date).getTime()
      );
    },
    enabled: !!memberId,
  });

  const getIcon = (type: Transaction["type"]) => {
    switch (type) {
      case "income":
        return <ArrowDownCircle className="h-4 w-4 text-green-600" />;
      case "expense":
        return <Receipt className="h-4 w-4 text-red-600" />;
      case "invoice":
        return <FileText className="h-4 w-4 text-blue-600" />;
      case "donation":
        return <Heart className="h-4 w-4 text-pink-600" />;
    }
  };

  const getTypeLabel = (type: Transaction["type"]) => {
    switch (type) {
      case "income":
        return "Inkomst";
      case "expense":
        return "Uitgave";
      case "invoice":
        return "Factuur";
      case "donation":
        return "Donatie";
    }
  };

  const getStatusBadge = (status: string | undefined, type: Transaction["type"]) => {
    if (!status) return null;

    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      paid: "default",
      pending: "secondary",
      sent: "outline",
      draft: "outline",
      overdue: "destructive",
      failed: "destructive",
    };

    const labels: Record<string, string> = {
      paid: "Betaald",
      pending: "In afwachting",
      sent: "Verzonden",
      draft: "Concept",
      overdue: "Vervallen",
      failed: "Mislukt",
    };

    return (
      <Badge variant={variants[status] || "secondary"} className="text-xs">
        {labels[status] || status}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Euro className="h-5 w-5" />
            Transacties
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Euro className="h-5 w-5" />
          Transacties ({transactions?.length || 0})
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!transactions || transactions.length === 0 ? (
          <p className="text-muted-foreground text-sm text-center py-4">
            Geen transacties gevonden voor dit lid.
          </p>
        ) : (
          <div className="space-y-2">
            {transactions.map((transaction) => (
              <div
                key={`${transaction.type}-${transaction.id}`}
                className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  {getIcon(transaction.type)}
                  <div>
                    <p className="font-medium text-sm">{transaction.description}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{getTypeLabel(transaction.type)}</span>
                      <span>•</span>
                      <span>
                        {format(new Date(transaction.date), "d MMM yyyy", { locale: nl })}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {getStatusBadge(transaction.status, transaction.type)}
                  <span
                    className={`font-semibold ${
                      transaction.amount >= 0 ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    {transaction.amount >= 0 ? "+" : ""}€{Math.abs(transaction.amount).toFixed(2)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
