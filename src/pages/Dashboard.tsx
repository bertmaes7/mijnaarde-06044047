import { MainLayout } from "@/components/layout/MainLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useMembers } from "@/hooks/useMembers";
import { useIncome, useExpenses } from "@/hooks/useFinance";
import { Users, Wallet, Euro, TrendingUp, UserPlus, ArrowDownCircle, ArrowUpCircle, Cake } from "lucide-react";
import { useMemo } from "react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";

export default function Dashboard() {
  const { data: members = [] } = useMembers();
  const { data: income = [] } = useIncome();
  const { data: expenses = [] } = useExpenses();

  // Calculate current quarter income and current balance
  const { quarterIncome, currentBalance, memberGrowthPercent } = useMemo(() => {
    const now = new Date();
    const currentQuarter = Math.floor(now.getMonth() / 3);
    const currentYear = now.getFullYear();
    const quarterStart = new Date(currentYear, currentQuarter * 3, 1);
    const quarterEnd = new Date(currentYear, (currentQuarter + 1) * 3, 0);

    const quarterTotal = income
      .filter((i) => {
        const date = new Date(i.date);
        return date >= quarterStart && date <= quarterEnd;
      })
      .reduce((sum, i) => sum + Number(i.amount), 0);

    const totalIncome = income.reduce((sum, i) => sum + Number(i.amount), 0);
    const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
    const balance = totalIncome - totalExpenses;

    const currentMonth = now.getMonth();
    const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;

    const membersThisMonth = members.filter((m) => {
      const dateStr = m.member_since || m.created_at;
      if (!dateStr) return false;
      const date = new Date(dateStr);
      return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
    }).length;

    const membersLastMonth = members.filter((m) => {
      const dateStr = m.member_since || m.created_at;
      if (!dateStr) return false;
      const date = new Date(dateStr);
      return date.getMonth() === lastMonth && date.getFullYear() === lastMonthYear;
    }).length;

    let growthPercent = 0;
    if (membersLastMonth > 0) {
      growthPercent = Math.round(((membersThisMonth - membersLastMonth) / membersLastMonth) * 100);
    } else if (membersThisMonth > 0) {
      growthPercent = 100;
    }

    return { quarterIncome: quarterTotal, currentBalance: balance, memberGrowthPercent: growthPercent };
  }, [income, expenses, members]);

  // Upcoming birthdays
  const upcomingBirthdays = useMemo(() => {
    const today = new Date();
    const results: Array<{
      id: string;
      first_name: string;
      last_name: string;
      date_of_birth: string;
      days_until: number;
      age: number;
    }> = [];

    for (const member of members) {
      const dob = (member as any).date_of_birth;
      if (!dob || !member.is_active) continue;

      const dobDate = new Date(dob);
      const thisYearBday = new Date(today.getFullYear(), dobDate.getMonth(), dobDate.getDate());
      if (thisYearBday < today) {
        thisYearBday.setFullYear(today.getFullYear() + 1);
      }

      const diffDays = Math.ceil((thisYearBday.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      // Also check if birthday was in the past 2 weeks
      const pastBday = new Date(today.getFullYear(), dobDate.getMonth(), dobDate.getDate());
      if (pastBday > today) {
        pastBday.setFullYear(today.getFullYear() - 1);
      }
      const pastDiffDays = Math.ceil((today.getTime() - pastBday.getTime()) / (1000 * 60 * 60 * 24));
      const isPast = pastDiffDays <= 14 && pastDiffDays > 0 && diffDays > 14;
      const effectiveDays = isPast ? -pastDiffDays : diffDays;
      if (effectiveDays <= 30 && effectiveDays >= -14) {
        results.push({
          id: member.id,
          first_name: member.first_name,
          last_name: member.last_name,
          date_of_birth: dob,
          days_until: effectiveDays,
          age: thisYearBday.getFullYear() - dobDate.getFullYear(),
        });
      }
    }

    return results.sort((a, b) => a.days_until - b.days_until).slice(0, 10);
  }, [members]);

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("nl-BE", { style: "currency", currency: "EUR" }).format(amount);

  const stats = [
    { title: "Totaal Leden", value: members.length, icon: Users, description: "Geregistreerde leden" },
    { title: "Inkomsten dit kwartaal", value: formatCurrency(quarterIncome), icon: Euro, description: "Huidige kwartaal" },
    { title: "Huidig Saldo", value: formatCurrency(currentBalance), icon: Wallet, description: "Inkomsten - Uitgaven" },
    { title: "Nieuwe leden", value: memberGrowthPercent >= 0 ? `+${memberGrowthPercent}%` : `${memberGrowthPercent}%`, icon: TrendingUp, description: "vs. vorige maand" },
  ];

  // Recent activities
  const recentActivities = useMemo(() => {
    type Activity = { id: string; type: "member" | "income" | "expense"; title: string; subtitle: string; date: Date; amount?: number };
    const activities: Activity[] = [];

    members.forEach((m) => {
      const date = m.member_since ? new Date(m.member_since) : new Date(m.created_at);
      activities.push({ id: `member-${m.id}`, type: "member", title: `${m.first_name} ${m.last_name}`, subtitle: "Nieuw lid", date });
    });
    income.forEach((i) => {
      activities.push({ id: `income-${i.id}`, type: "income", title: i.description, subtitle: i.member?.first_name ? `${i.member.first_name} ${i.member.last_name}` : i.company?.name || "Inkomst", date: new Date(i.date), amount: Number(i.amount) });
    });
    expenses.forEach((e) => {
      activities.push({ id: `expense-${e.id}`, type: "expense", title: e.description, subtitle: e.company?.name || (e.member?.first_name ? `${e.member.first_name} ${e.member.last_name}` : "Uitgave"), date: new Date(e.date), amount: Number(e.amount) });
    });

    return activities.sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, 10);
  }, [members, income, expenses]);

  const getActivityIcon = (type: "member" | "income" | "expense") => {
    switch (type) {
      case "member": return <UserPlus className="h-4 w-4 text-primary" />;
      case "income": return <ArrowDownCircle className="h-4 w-4 text-success" />;
      case "expense": return <ArrowUpCircle className="h-4 w-4 text-destructive" />;
    }
  };

  const getActivityBadge = (type: "member" | "income" | "expense") => {
    switch (type) {
      case "member": return <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary">Lid</span>;
      case "income": return <span className="text-xs px-2 py-1 rounded-full bg-success/10 text-success">Inkomst</span>;
      case "expense": return <span className="text-xs px-2 py-1 rounded-full bg-destructive/10 text-destructive">Uitgave</span>;
    }
  };

  return (
    <MainLayout>
      <div className="space-y-8">
        <PageHeader title="Dashboard" description="Welkom bij Mijn Aarde vzw ledenbeheersysteem" />

        {/* Stats Grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <Card key={stat.title} className="card-elevated">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{stat.title}</CardTitle>
                <stat.icon className="h-5 w-5 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground">{stat.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          {/* Recent Activities */}
          <Card className="card-elevated lg:col-span-2">
            <CardHeader>
              <CardTitle className="font-display text-xl">Recente Activiteiten</CardTitle>
            </CardHeader>
            <CardContent>
              {recentActivities.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Nog geen activiteiten. Voeg leden, inkomsten of uitgaven toe om te beginnen.
                </p>
              ) : (
                <div className="space-y-3">
                  {recentActivities.map((activity) => (
                    <div key={activity.id} className="flex items-center justify-between rounded-lg border p-3">
                      <div className="flex items-center gap-3">
                        {getActivityIcon(activity.type)}
                        <div>
                          <p className="font-medium">{activity.title}</p>
                          <p className="text-sm text-muted-foreground">
                            {activity.subtitle} • {activity.date.toLocaleDateString("nl-BE")}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {activity.amount !== undefined && (
                          <span className={`font-medium ${activity.type === "income" ? "text-success" : "text-destructive"}`}>
                            {activity.type === "income" ? "+" : "-"}{formatCurrency(activity.amount)}
                          </span>
                        )}
                        {getActivityBadge(activity.type)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Upcoming Birthdays */}
          <Card className="card-elevated">
            <CardHeader>
              <CardTitle className="font-display text-xl flex items-center gap-2">
                <Cake className="h-5 w-5 text-primary" />
                Verjaardagen
              </CardTitle>
            </CardHeader>
            <CardContent>
              {upcomingBirthdays.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Geen aankomende verjaardagen
                </p>
              ) : (
                <div className="space-y-3">
                  {upcomingBirthdays.map((b) => {
                    const dob = new Date(b.date_of_birth);
                    const dayLabel = b.days_until === 0 ? "🎂 Vandaag!" : b.days_until === 1 ? "Morgen" : b.days_until < 0 ? `${Math.abs(b.days_until)} dagen geleden` : `Over ${b.days_until} dagen`;
                    return (
                      <div key={b.id} className="flex items-center justify-between rounded-lg border p-3">
                        <div>
                          <p className="font-medium">{b.first_name} {b.last_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {format(dob, "d MMMM", { locale: nl })} • {b.age} jaar
                          </p>
                        </div>
                        <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                          b.days_until === 0 ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                        }`}>
                          {dayLabel}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}
