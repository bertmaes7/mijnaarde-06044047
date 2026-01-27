import { useEffect, useState } from "react";
import { useAuthContext } from "@/contexts/AuthContext";
import { supabase, Member, Income, Expense } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Leaf, LogOut, User, Calendar, CreditCard, TrendingUp, TrendingDown, Save, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";

export default function MemberPortal() {
  const { user, memberId, signOut, isAdmin } = useAuthContext();
  const [member, setMember] = useState<Member | null>(null);
  const [income, setIncome] = useState<Income[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [editedMember, setEditedMember] = useState<Partial<Member>>({});

  useEffect(() => {
    if (memberId) {
      fetchMemberData();
    }
  }, [memberId]);

  const fetchMemberData = async () => {
    if (!memberId) return;
    
    setIsLoading(true);
    try {
      // Fetch member data
      const { data: memberData, error: memberError } = await supabase
        .from("members")
        .select("*, company:companies(*)")
        .eq("id", memberId)
        .single();

      if (memberError) throw memberError;
      setMember(memberData as Member);
      setEditedMember(memberData);

      // Fetch income
      const { data: incomeData } = await supabase
        .from("income")
        .select("*")
        .eq("member_id", memberId)
        .order("date", { ascending: false });

      setIncome((incomeData || []) as Income[]);

      // Fetch expenses
      const { data: expenseData } = await supabase
        .from("expenses")
        .select("*")
        .eq("member_id", memberId)
        .order("date", { ascending: false });

      setExpenses((expenseData || []) as Expense[]);
    } catch (error) {
      console.error("Error fetching member data:", error);
      toast.error("Fout bij ophalen van gegevens");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!memberId) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("members")
        .update({
          first_name: editedMember.first_name,
          last_name: editedMember.last_name,
          phone: editedMember.phone,
          mobile: editedMember.mobile,
          address: editedMember.address,
          postal_code: editedMember.postal_code,
          city: editedMember.city,
          country: editedMember.country,
          personal_url: editedMember.personal_url,
          notes: editedMember.notes,
        })
        .eq("id", memberId);

      if (error) throw error;
      toast.success("Gegevens opgeslagen");
      fetchMemberData();
    } catch (error) {
      console.error("Error saving member:", error);
      toast.error("Fout bij opslaan");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
  };

  const totalIncome = income.reduce((sum, i) => sum + i.amount, 0);
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl gradient-earth">
              <Leaf className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-display text-lg font-bold">Mijn Aarde</h1>
              <p className="text-xs text-muted-foreground">Ledenportaal</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {isAdmin && (
              <Button variant="outline" size="sm" asChild>
                <a href="/">Beheerder Dashboard</a>
              </Button>
            )}
            <span className="text-sm text-muted-foreground">{user?.email}</span>
            <Button variant="ghost" size="icon" onClick={handleSignOut}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto p-4 md:p-8">
        <div className="mb-8">
          <h2 className="font-display text-3xl font-bold">
            Welkom, {member?.first_name}!
          </h2>
          <p className="text-muted-foreground">
            Bekijk en bewerk je profielgegevens
          </p>
        </div>

        {/* Stats */}
        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="card-elevated">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Lid Sinds
              </CardTitle>
              <Calendar className="h-5 w-5 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {member?.member_since
                  ? format(new Date(member.member_since), "d MMM yyyy", { locale: nl })
                  : "-"}
              </div>
            </CardContent>
          </Card>

          <Card className="card-elevated">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Status
              </CardTitle>
              <User className="h-5 w-5 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {member?.is_active ? "Actief" : "Inactief"}
              </div>
              <p className="text-xs text-muted-foreground">
                {member?.is_board_member && "Bestuurslid • "}
                {member?.is_ambassador && "Ambassadeur • "}
                {member?.is_donor && "Donateur"}
              </p>
            </CardContent>
          </Card>

          <Card className="card-elevated">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Bijdragen
              </CardTitle>
              <TrendingUp className="h-5 w-5 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-success">
                €{totalIncome.toFixed(2)}
              </div>
              <p className="text-xs text-muted-foreground">
                {income.length} transactie(s)
              </p>
            </CardContent>
          </Card>

          <Card className="card-elevated">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Declaraties
              </CardTitle>
              <TrendingDown className="h-5 w-5 text-accent" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-accent">
                €{totalExpenses.toFixed(2)}
              </div>
              <p className="text-xs text-muted-foreground">
                {expenses.length} transactie(s)
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-8 lg:grid-cols-2">
          {/* Profile Form */}
          <Card className="card-elevated">
            <CardHeader>
              <CardTitle className="font-display">Mijn Gegevens</CardTitle>
              <CardDescription>Bewerk je persoonlijke informatie</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">Voornaam</Label>
                  <Input
                    id="firstName"
                    value={editedMember.first_name || ""}
                    onChange={(e) =>
                      setEditedMember({ ...editedMember, first_name: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Achternaam</Label>
                  <Input
                    id="lastName"
                    value={editedMember.last_name || ""}
                    onChange={(e) =>
                      setEditedMember({ ...editedMember, last_name: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">E-mailadres</Label>
                <Input id="email" value={member?.email || ""} disabled />
                <p className="text-xs text-muted-foreground">
                  E-mailadres kan niet worden gewijzigd
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Telefoon</Label>
                  <Input
                    id="phone"
                    value={editedMember.phone || ""}
                    onChange={(e) =>
                      setEditedMember({ ...editedMember, phone: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="mobile">Mobiel</Label>
                  <Input
                    id="mobile"
                    value={editedMember.mobile || ""}
                    onChange={(e) =>
                      setEditedMember({ ...editedMember, mobile: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Adres</Label>
                <Input
                  id="address"
                  value={editedMember.address || ""}
                  onChange={(e) =>
                    setEditedMember({ ...editedMember, address: e.target.value })
                  }
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="postalCode">Postcode</Label>
                  <Input
                    id="postalCode"
                    value={editedMember.postal_code || ""}
                    onChange={(e) =>
                      setEditedMember({ ...editedMember, postal_code: e.target.value })
                    }
                  />
                </div>
                <div className="col-span-2 space-y-2">
                  <Label htmlFor="city">Plaats</Label>
                  <Input
                    id="city"
                    value={editedMember.city || ""}
                    onChange={(e) =>
                      setEditedMember({ ...editedMember, city: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="website">Persoonlijke Website</Label>
                <Input
                  id="website"
                  value={editedMember.personal_url || ""}
                  onChange={(e) =>
                    setEditedMember({ ...editedMember, personal_url: e.target.value })
                  }
                />
              </div>

              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Opslaan
              </Button>
            </CardContent>
          </Card>

          {/* Activity */}
          <Card className="card-elevated">
            <CardHeader>
              <CardTitle className="font-display">Recente Activiteit</CardTitle>
              <CardDescription>Je financiële transacties</CardDescription>
            </CardHeader>
            <CardContent>
              {income.length === 0 && expenses.length === 0 ? (
                <p className="py-8 text-center text-muted-foreground">
                  Geen transacties gevonden
                </p>
              ) : (
                <div className="space-y-3">
                  {[...income.map(i => ({ ...i, _type: 'income' as const })), 
                    ...expenses.map(e => ({ ...e, _type: 'expense' as const }))]
                    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                    .slice(0, 10)
                    .map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between rounded-lg border p-3"
                      >
                        <div className="flex items-center gap-3">
                          {item._type === 'income' ? (
                            <TrendingUp className="h-4 w-4 text-success" />
                          ) : (
                            <TrendingDown className="h-4 w-4 text-accent" />
                          )}
                          <div>
                            <p className="text-sm font-medium">{item.description}</p>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(item.date), "d MMM yyyy", { locale: nl })}
                            </p>
                          </div>
                        </div>
                        <span
                          className={`font-medium ${
                            item._type === 'income' ? "text-success" : "text-accent"
                          }`}
                        >
                          {item._type === 'income' ? '+' : '-'}€{item.amount.toFixed(2)}
                        </span>
                      </div>
                    ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
