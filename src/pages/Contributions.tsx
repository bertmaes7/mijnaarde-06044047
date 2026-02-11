import { useState, useMemo } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
import { useContributions, useCreateContribution, useUpdateContribution, useDeleteContribution, useContributionAmount } from "@/hooks/useContributions";
import { useMembers } from "@/hooks/useMembers";
import { Euro, Check, Clock, X, Users, Loader2, Trash2, Mail } from "lucide-react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export default function Contributions() {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [isSendingInvites, setIsSendingInvites] = useState(false);

  const { data: contributions = [], isLoading } = useContributions(selectedYear);
  const { data: members = [] } = useMembers();
  const { data: defaultAmount = 25 } = useContributionAmount();
  const createContribution = useCreateContribution();
  const updateContribution = useUpdateContribution();
  const deleteContribution = useDeleteContribution();

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

  const handleMarkPaid = async (id: string, memberId: string, amount: number) => {
    await updateContribution.mutateAsync({
      id,
      data: { status: "paid", paid_at: new Date().toISOString() },
    });
    // Also create income record
    await supabase.from("income").insert({
      description: `Lidgeld ${selectedYear}`,
      amount,
      date: new Date().toISOString().split("T")[0],
      type: "lidgeld",
      member_id: memberId,
      notes: "Handmatig gemarkeerd als betaald",
    });
  };

  const handleSendInvites = async () => {
    const pendingCount = contributions.filter(c => c.status === "pending").length;
    if (pendingCount === 0) {
      toast.info("Geen openstaande lidgelden om uitnodigingen voor te sturen");
      return;
    }

    setIsSendingInvites(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-contribution-invites", {
        body: { year: selectedYear },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success(`${data.sent} uitnodiging(en) verstuurd`);
      if (data.failed > 0) {
        toast.warning(`${data.failed} uitnodiging(en) mislukt`);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Fout bij versturen uitnodigingen");
    } finally {
      setIsSendingInvites(false);
    }
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
              <Button variant="outline" onClick={handleSendInvites} disabled={isSendingInvites || stats.pending === 0}>
                {isSendingInvites ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Mail className="h-4 w-4 mr-2" />}
                Stuur betaaluitnodigingen ({stats.pending})
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
                      <TableCell>
                        <Input
                          type="number"
                          step="0.01"
                          className="w-24 h-8"
                          defaultValue={Number(c.amount).toFixed(2)}
                          onBlur={(e) => {
                            const newAmount = parseFloat(e.target.value);
                            if (!isNaN(newAmount) && newAmount !== Number(c.amount)) {
                              updateContribution.mutate({ id: c.id, data: { amount: newAmount } });
                            }
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <Select
                          value={c.status}
                          onValueChange={(value) => {
                            const data: Record<string, unknown> = { status: value };
                            if (value === "paid" && !c.paid_at) {
                              data.paid_at = new Date().toISOString();
                            }
                            if (value !== "paid") {
                              data.paid_at = null;
                            }
                            updateContribution.mutate({ id: c.id, data });
                          }}
                        >
                          <SelectTrigger className="w-[130px] h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">
                              <span className="flex items-center gap-1"><Clock className="h-3 w-3" />Open</span>
                            </SelectItem>
                            <SelectItem value="paid">
                              <span className="flex items-center gap-1"><Check className="h-3 w-3" />Betaald</span>
                            </SelectItem>
                            <SelectItem value="failed">
                              <span className="flex items-center gap-1"><X className="h-3 w-3" />Mislukt</span>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        {c.paid_at
                          ? format(new Date(c.paid_at), "d MMM yyyy", { locale: nl })
                          : "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {c.status === "pending" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleMarkPaid(c.id, c.member_id, Number(c.amount))}
                            >
                              <Check className="h-3 w-3 mr-1" />
                              Betaald
                            </Button>
                          )}
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive">
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Lidgeld verwijderen?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Weet je zeker dat je het lidgeld van {c.member ? `${c.member.first_name} ${c.member.last_name}` : "dit lid"} voor {selectedYear} wilt verwijderen? Dit kan niet ongedaan worden gemaakt.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Annuleren</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => deleteContribution.mutate(c.id)}
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
      </div>
    </MainLayout>
  );
}
