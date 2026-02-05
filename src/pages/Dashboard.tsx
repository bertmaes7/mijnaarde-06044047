import { MainLayout } from "@/components/layout/MainLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useMembers } from "@/hooks/useMembers";
import { useCompanies } from "@/hooks/useCompanies";
import { useIncome } from "@/hooks/useFinance";
import { Users, Building2, Euro, TrendingUp } from "lucide-react";
import { useMemo } from "react";

export default function Dashboard() {
  const { data: members = [] } = useMembers();
  const { data: companies = [] } = useCompanies();
  const { data: income = [] } = useIncome();

  // Calculate current quarter income
  const { quarterIncome, memberGrowthPercent } = useMemo(() => {
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

    // Calculate member growth: compare current month vs previous month
    const currentMonth = now.getMonth();
    const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;

    const membersThisMonth = members.filter((m) => {
      if (!m.member_since) return false;
      const date = new Date(m.member_since);
      return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
    }).length;

    const membersLastMonth = members.filter((m) => {
      if (!m.member_since) return false;
      const date = new Date(m.member_since);
      return date.getMonth() === lastMonth && date.getFullYear() === lastMonthYear;
    }).length;

    let growthPercent = 0;
    if (membersLastMonth > 0) {
      growthPercent = Math.round(((membersThisMonth - membersLastMonth) / membersLastMonth) * 100);
    } else if (membersThisMonth > 0) {
      growthPercent = 100;
    }

    return { quarterIncome: quarterTotal, memberGrowthPercent: growthPercent };
  }, [income, members]);

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("nl-BE", { style: "currency", currency: "EUR" }).format(amount);

  const stats = [
    {
      title: "Totaal Leden",
      value: members.length,
      icon: Users,
      description: "Geregistreerde leden",
    },
    {
      title: "Inkomsten dit kwartaal",
      value: formatCurrency(quarterIncome),
      icon: Euro,
      description: "Huidige kwartaal",
    },
    {
      title: "Bedrijven",
      value: companies.length,
      icon: Building2,
      description: "Gekoppelde organisaties",
    },
    {
      title: "Nieuwe leden",
      value: memberGrowthPercent >= 0 ? `+${memberGrowthPercent}%` : `${memberGrowthPercent}%`,
      icon: TrendingUp,
      description: "vs. vorige maand",
    },
  ];

  return (
    <MainLayout>
      <div className="space-y-8">
        <PageHeader
          title="Dashboard"
          description="Welkom bij Mijn Aarde vzw ledenbeheersysteem"
        />

        {/* Stats Grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <Card key={stat.title} className="card-elevated">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <stat.icon className="h-5 w-5 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground">
                  {stat.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Recent Activity */}
        <Card className="card-elevated">
          <CardHeader>
            <CardTitle className="font-display text-xl">
              Recente Leden
            </CardTitle>
          </CardHeader>
          <CardContent>
            {members.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Nog geen leden toegevoegd. Ga naar{" "}
                <a href="/members" className="text-primary hover:underline">
                  Leden
                </a>{" "}
                om te beginnen.
              </p>
            ) : (
              <div className="space-y-4">
                {members.slice(0, 5).map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div>
                      <p className="font-medium">
                        {member.first_name} {member.last_name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {member.company?.name || "Geen bedrijf"}
                      </p>
                    </div>
                    <span
                      className={`text-xs px-2 py-1 rounded-full ${
                        member.is_active
                          ? "bg-success/10 text-success"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {member.is_active ? "Actief" : "Inactief"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
