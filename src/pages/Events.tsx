import { useState } from "react";
import { Link } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Plus, Trash2, CalendarIcon, MapPin, Users, Eye, ArrowLeft, ExternalLink, Copy } from "lucide-react";
import {
  useEvents,
  useCreateEvent,
  useUpdateEvent,
  useDeleteEvent,
  Event,
} from "@/hooks/useEvents";
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
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function Events() {
  const { data: events, isLoading } = useEvents();
  const createEvent = useCreateEvent();
  const updateEvent = useUpdateEvent();
  const deleteEvent = useDeleteEvent();

  const [isCreating, setIsCreating] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    event_date: null as Date | null,
    event_time: "19:00",
    location: "",
    max_participants: "" as string,
    is_published: false,
  });

  const handleCreate = () => {
    setIsCreating(true);
    setSelectedEvent(null);
    setFormData({
      title: "",
      description: "",
      event_date: null,
      event_time: "19:00",
      location: "",
      max_participants: "",
      is_published: false,
    });
  };

  const handleEdit = (event: Event) => {
    setSelectedEvent(event);
    setIsCreating(false);
    const eventDate = new Date(event.event_date);
    setFormData({
      title: event.title,
      description: event.description || "",
      event_date: eventDate,
      event_time: format(eventDate, "HH:mm"),
      location: event.location || "",
      max_participants: event.max_participants?.toString() || "",
      is_published: event.is_published,
    });
  };

  const handleBack = () => {
    setSelectedEvent(null);
    setIsCreating(false);
  };

  const getEventDateTime = () => {
    if (!formData.event_date) return null;
    const [hours, minutes] = formData.event_time.split(":").map(Number);
    const dateTime = new Date(formData.event_date);
    dateTime.setHours(hours, minutes, 0, 0);
    return dateTime.toISOString();
  };

  const handleSave = () => {
    const eventDate = getEventDateTime();
    if (!eventDate) {
      toast.error("Selecteer een datum");
      return;
    }

    const data = {
      title: formData.title,
      description: formData.description || null,
      event_date: eventDate,
      location: formData.location || null,
      max_participants: formData.max_participants ? parseInt(formData.max_participants) : null,
      is_published: formData.is_published,
    };

    if (isCreating) {
      createEvent.mutate(data, {
        onSuccess: () => {
          setIsCreating(false);
        },
      });
    } else if (selectedEvent) {
      updateEvent.mutate(
        { id: selectedEvent.id, data },
        {
          onSuccess: () => {
            setSelectedEvent(null);
          },
        }
      );
    }
  };

  const copyEventLink = (eventId: string) => {
    const url = `${window.location.origin}/events/${eventId}`;
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

  // Show editor view
  if (isCreating || selectedEvent) {
    return (
      <MainLayout>
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={handleBack}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                {isCreating ? "Nieuw Event" : "Event bewerken"}
              </h1>
              <p className="text-muted-foreground">
                {isCreating ? "Maak een nieuw event aan" : `Bewerk "${selectedEvent?.title}"`}
              </p>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Event gegevens</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Titel *</Label>
                    <Input
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="bijv. Jaarvergadering 2024"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Beschrijving</Label>
                    <Textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Beschrijf het event..."
                      rows={4}
                    />
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Datum *</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !formData.event_date && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {formData.event_date ? (
                              format(formData.event_date, "PPP", { locale: nl })
                            ) : (
                              "Kies een datum"
                            )}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={formData.event_date || undefined}
                            onSelect={(date) => setFormData({ ...formData, event_date: date || null })}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div className="space-y-2">
                      <Label>Tijd *</Label>
                      <Input
                        type="time"
                        value={formData.event_time}
                        onChange={(e) => setFormData({ ...formData, event_time: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Locatie</Label>
                      <Input
                        value={formData.location}
                        onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                        placeholder="bijv. Gemeentehuis, Grote zaal"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Max. deelnemers</Label>
                      <Input
                        type="number"
                        value={formData.max_participants}
                        onChange={(e) => setFormData({ ...formData, max_participants: e.target.value })}
                        placeholder="Onbeperkt"
                        min="1"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Publicatie</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Event publiceren</Label>
                      <p className="text-sm text-muted-foreground">
                        Gepubliceerde events zijn zichtbaar op de publieke pagina
                      </p>
                    </div>
                    <Switch
                      checked={formData.is_published}
                      onCheckedChange={(checked) => setFormData({ ...formData, is_published: checked })}
                    />
                  </div>
                </CardContent>
              </Card>

              <div className="flex gap-2">
                <Button onClick={handleSave} disabled={!formData.title || !formData.event_date}>
                  {isCreating ? "Aanmaken" : "Opslaan"}
                </Button>
                <Button variant="outline" onClick={handleBack}>
                  Annuleren
                </Button>
              </div>
            </div>

            {selectedEvent && (
              <Card>
                <CardHeader>
                  <CardTitle>Event link</CardTitle>
                  <CardDescription>Deel deze link voor inschrijvingen</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-2">
                    <Button variant="outline" className="flex-1" onClick={() => copyEventLink(selectedEvent.id)}>
                      <Copy className="h-4 w-4 mr-2" />
                      Kopieer link
                    </Button>
                    <Button variant="outline" asChild>
                      <Link to={`/events/${selectedEvent.id}`} target="_blank">
                        <ExternalLink className="h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                  <Button variant="secondary" className="w-full" asChild>
                    <Link to={`/events/${selectedEvent.id}/registrations`}>
                      <Users className="h-4 w-4 mr-2" />
                      Bekijk inschrijvingen
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </MainLayout>
    );
  }

  // Show list view
  return (
    <MainLayout>
      <div className="space-y-6">
        <PageHeader
          title="Events"
          description="Beheer events en bekijk inschrijvingen"
          actions={
            <Button onClick={handleCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Nieuw event
            </Button>
          }
        />

        <Card>
          <CardContent className="p-0">
            {events?.length === 0 ? (
              <div className="text-center py-12">
                <CalendarIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">Geen events</h3>
                <p className="text-muted-foreground mb-4">
                  Maak je eerste event aan om te beginnen.
                </p>
                <Button onClick={handleCreate}>
                  <Plus className="h-4 w-4 mr-2" />
                  Nieuw event
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Event</TableHead>
                    <TableHead>Datum</TableHead>
                    <TableHead>Locatie</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[140px]">Acties</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {events?.map((event) => {
                    const isPast = new Date(event.event_date) < new Date();
                    return (
                      <TableRow
                        key={event.id}
                        className="cursor-pointer"
                        onClick={() => handleEdit(event)}
                      >
                        <TableCell className="font-medium">{event.title}</TableCell>
                        <TableCell>
                          {format(new Date(event.event_date), "d MMM yyyy HH:mm", { locale: nl })}
                        </TableCell>
                        <TableCell>{event.location || "-"}</TableCell>
                        <TableCell>
                          {isPast ? (
                            <Badge variant="secondary">Afgelopen</Badge>
                          ) : event.is_published ? (
                            <Badge variant="default">Gepubliceerd</Badge>
                          ) : (
                            <Badge variant="outline">Concept</Badge>
                          )}
                        </TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" asChild>
                              <Link to={`/events/${event.id}/registrations`}>
                                <Users className="h-4 w-4" />
                              </Link>
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Event verwijderen?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Dit verwijdert ook alle inschrijvingen. Dit kan niet ongedaan worden gemaakt.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Annuleren</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => deleteEvent.mutate(event.id)}>
                                    Verwijderen
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
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
