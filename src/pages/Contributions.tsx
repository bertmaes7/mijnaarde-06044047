import { useState, useMemo } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useContributions, useCreateContribution, useUpdateContribution, useContributionAmount } from "@/hooks/useContributions";
import { useMembers } from "@/hooks/useMembers";
import { Euro, Plus, Check, Clock, X, Users, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { toast } from "sonner";

export default function Contributions() {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const { data: contributions = [], isLoading } = useContributions(selectedYear);
  const { data: members = [] } = useMembers();
  const { data: defaultAmount = 25 } = useContributionAmount();
  const createContribution = useCreateContribution();
  const updateContribution = useUpdateContribution();

  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

  const stats = useMemo(() => {
    const paid = contributions.filter(c => c.status === "paid");
    const pending = contributions.filter(c => c.status === "pending");
    return {
      total: contributions.length,
      paid: paid.length,
      pending: pending.length,
      totalAmount: paid.reduce((sum, c) => sum + Number(c.amount), 0),
    };
  }, [contributions]);

  const handleGenerateForAll = async () => {
    const activeMembers = members.filter(m => m.is_active_member);
    const existingMemberIds = new Set(contributions.map(c => c.member_id));
    const newMembers = activeMembers.filter(m => !existingMemberIds.has(m.id));

    if (newMembers.length === 0) {
      toast.info("Alle actieve leden hebben al lidgeld voor dit jaar");
      return;
    }

    for (const member of newMembers) {
      await createContribution.mutateAsync({
        member_id: member.id,
        contribution_year: selectedYear,
        amount: defaultAmount,
      });
    }
    toast.success(`${newMembers.length} lidgelden aangemaakt`);
  };

  const handleMarkPaid = async (id: string) => {
    await updateContribution.mutateAsync({
      id,
      data: { status: "paid", paid_at: new Date().toISOString() },
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "paid":
        return <Badge className="bg-success/10 text-success border-success/20"><Check className="h-3 w-3 mr-1" />Betaald</Badge>;
      case "pending":
        return <Badge variant="outline" className="text-warning border-warning/20"><Clock className="h-3 w-3 mr-1" />Open</Badge>;
      case "failed":
        return <Badge variant="destructive"><X className="h-3 w-3 mr-1" />Mislukt</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <PageHeader
          title="Lidgeld"
          description="Beheer jaarlijks lidgeld"
          actions={
            <div className="flex items-center gap-3">
              <Select value={String(selectedYear)} onValueChange={(v) => setSelectedYear(Number(v))}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {years.map(y => (
                    <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={handleGenerateForAll} disabled={createContribution.isPending}>
                {createContribution.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Users className="h-4 w-4 mr-2" />}
                Genereer voor alle leden
              </Button>
            </div>
          }
        />

        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-4">
          <Card className="card-elevated">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Totaal</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>
          <Card className="card-elevated">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Betaald</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-success">{stats.paid}</div>
            </CardContent>
          </Card>
          <Card className="card-elevated">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Open</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-warning">{stats.pending}</div>
            </CardContent>
          </Card>
          <Card className="card-elevated">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Ontvangen</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">€{stats.totalAmount.toFixed(2)}</div>
            </CardContent>
          </Card>
        </div>

        {/* Table */}
        <Card className="card-elevated">
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : contributions.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">
                <Euro className="h-12 w-12 mx-auto mb-4 opacity-20" />
                <p>Geen lidgeld voor {selectedYear}</p>
                <Button variant="outline" className="mt-4" onClick={handleGenerateForAll}>
                  Genereer lidgeld
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Lid</TableHead>
                    <TableHead>Bedrag</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Betaald op</TableHead>
                    <TableHead className="text-right">Acties</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contributions.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">
                        {c.member ? `${c.member.first_name} ${c.member.last_name}` : "Onbekend"}
                      </TableCell>
                      <TableCell>€{Number(c.amount).toFixed(2)}</TableCell>
                      <TableCell>{getStatusBadge(c.status)}</TableCell>
                      <TableCell>
                        {c.paid_at
                          ? format(new Date(c.paid_at), "d MMM yyyy", { locale: nl })
                          : "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        {c.status === "pending" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleMarkPaid(c.id)}
                          >
                            <Check className="h-3 w-3 mr-1" />
                            Markeer betaald
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
