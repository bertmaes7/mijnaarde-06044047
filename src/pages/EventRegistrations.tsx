import { Link, useParams } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, CalendarIcon, MapPin, Users, Mail, ExternalLink, Copy } from "lucide-react";
import { useEvent } from "@/hooks/useEvents";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { toast } from "sonner";

export default function EventRegistrations() {
  const { id } = useParams<{ id: string }>();
  const { data: event, isLoading } = useEvent(id);

  const copyEventLink = () => {
    const url = `${window.location.origin}/events/${id}`;
    navigator.clipboard.writeText(url);
    toast.success("Link gekopieerd!");
  };

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Laden...</p>
        </div>
      </MainLayout>
    );
  }

  if (!event) {
    return (
      <MainLayout>
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold">Event niet gevonden</h2>
          <Button variant="link" asChild>
            <Link to="/events">Terug naar events</Link>
          </Button>
        </div>
      </MainLayout>
    );
  }

  const spotsLeft = event.max_participants
    ? event.max_participants - event.registration_count
    : null;

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/events">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold tracking-tight">{event.title}</h1>
            <p className="text-muted-foreground">Inschrijvingen beheren</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={copyEventLink}>
              <Copy className="h-4 w-4 mr-2" />
              Kopieer link
            </Button>
            <Button variant="outline" asChild>
              <Link to={`/events/${id}`} target="_blank">
                <ExternalLink className="h-4 w-4 mr-2" />
                Bekijk pagina
              </Link>
            </Button>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <CalendarIcon className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Datum & tijd</p>
                  <p className="font-medium">
                    {format(new Date(event.event_date), "d MMMM yyyy", { locale: nl })}
                  </p>
                  <p className="text-sm">
                    {format(new Date(event.event_date), "HH:mm", { locale: nl })} uur
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <MapPin className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Locatie</p>
                  <p className="font-medium">{event.location || "Niet opgegeven"}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Users className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Inschrijvingen</p>
                  <p className="font-medium">
                    {event.registration_count}
                    {event.max_participants && ` / ${event.max_participants}`}
                  </p>
                  {spotsLeft !== null && spotsLeft > 0 && (
                    <p className="text-sm text-muted-foreground">{spotsLeft} plekken over</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div
                  className={`h-3 w-3 rounded-full ${event.is_published ? "bg-green-500" : "bg-yellow-500"}`}
                />
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <p className="font-medium">{event.is_published ? "Gepubliceerd" : "Concept"}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Ingeschreven deelnemers ({event.registration_count})</CardTitle>
            <CardDescription>Alle bevestigde inschrijvingen voor dit event</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {event.registrations.length === 0 ? (
              <div className="text-center py-12">
                <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">Nog geen inschrijvingen</h3>
                <p className="text-muted-foreground">
                  Deel de event link om inschrijvingen te ontvangen.
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Naam</TableHead>
                    <TableHead>E-mail</TableHead>
                    <TableHead>Ingeschreven op</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {event.registrations.map((reg, index) => (
                    <TableRow key={reg.id}>
                      <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                      <TableCell className="font-medium">
                        <Link
                          to={`/members/${reg.member_id}`}
                          className="hover:underline"
                        >
                          {reg.member?.first_name} {reg.member?.last_name}
                        </Link>
                      </TableCell>
                      <TableCell>
                        {reg.member?.email ? (
                          <a
                            href={`mailto:${reg.member.email}`}
                            className="flex items-center gap-1 text-primary hover:underline"
                          >
                            <Mail className="h-3 w-3" />
                            {reg.member.email}
                          </a>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell>
                        {format(new Date(reg.registered_at), "d MMM yyyy HH:mm", { locale: nl })}
                      </TableCell>
                      <TableCell>
                        <Badge variant={reg.status === "confirmed" ? "default" : "secondary"}>
                          {reg.status === "confirmed" ? "Bevestigd" : reg.status}
                        </Badge>
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
