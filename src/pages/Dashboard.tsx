import { MainLayout } from "@/components/layout/MainLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useMembers } from "@/hooks/useMembers";
import { useCompanies } from "@/hooks/useCompanies";
import { Users, Building2, UserCheck, TrendingUp } from "lucide-react";

export default function Dashboard() {
  const { data: members = [] } = useMembers();
  const { data: companies = [] } = useCompanies();

  const activeMembers = members.filter((m) => m.is_active).length;

  const stats = [
    {
      title: "Totaal Leden",
      value: members.length,
      icon: Users,
      description: "Geregistreerde leden",
    },
    {
      title: "Actieve Leden",
      value: activeMembers,
      icon: UserCheck,
      description: "Momenteel actief",
    },
    {
      title: "Bedrijven",
      value: companies.length,
      icon: Building2,
      description: "Gekoppelde organisaties",
    },
    {
      title: "Groeipercentage",
      value: "+12%",
      icon: TrendingUp,
      description: "Afgelopen maand",
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
