import { useState, useMemo } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, Trash2, Send, Clock, CalendarIcon, ArrowLeft, Users, Mail, Loader2, Search } from "lucide-react";
import {
  useMailings,
  useMailingTemplates,
  useCreateMailing,
  useUpdateMailing,
  useDeleteMailing,
  Mailing,
} from "@/hooks/useMailing";
import { useMembers } from "@/hooks/useMembers";
import { useCompanies } from "@/hooks/useCompanies";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
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
import { RecipientFilters, RecipientFiltersState, applyRecipientFilters } from "@/components/mailing/RecipientFilters";

const statusLabels: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  draft: { label: "Concept", variant: "secondary" },
  scheduled: { label: "Ingepland", variant: "default" },
  sent: { label: "Verzonden", variant: "outline" },
  failed: { label: "Mislukt", variant: "destructive" },
};

export default function Mailings() {
  const { data: mailings, isLoading, refetch } = useMailings();
  const { data: templates } = useMailingTemplates();
  const { data: members } = useMembers();
  const { data: companies = [] } = useCompanies();
  const createMailing = useCreateMailing();
  const updateMailing = useUpdateMailing();
  const deleteMailing = useDeleteMailing();

  const [isCreating, setIsCreating] = useState(false);
  const [selectedMailing, setSelectedMailing] = useState<Mailing | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [memberSearch, setMemberSearch] = useState("");
  const [recipientFilters, setRecipientFilters] = useState<RecipientFiltersState>({
    status: "all",
    companyId: "all",
    city: "all",
    membershipType: "all",
  });
  const [formData, setFormData] = useState({
    title: "",
    template_id: "" as string,
    selection_type: "all" as "all" | "manual",
    selected_member_ids: [] as string[],
    scheduled_at: null as Date | null,
    scheduled_time: "09:00",
  });

  // Get all members with email for mailing
  const membersWithEmail = members?.filter((m) => m.email) || [];
  
  // Apply filters to get filtered members
  const filteredMembers = useMemo(() => {
    let result = applyRecipientFilters(membersWithEmail, recipientFilters);
    
    // Apply search
    if (memberSearch) {
      const searchLower = memberSearch.toLowerCase();
      result = result.filter((m) =>
        `${m.first_name} ${m.last_name}`.toLowerCase().includes(searchLower) ||
        m.email?.toLowerCase().includes(searchLower) ||
        m.city?.toLowerCase().includes(searchLower)
      );
    }
    
    return result;
  }, [membersWithEmail, recipientFilters, memberSearch]);

  // Get unique cities for filter
  const cities = useMemo(() => {
    const uniqueCities = new Set(membersWithEmail.map((m) => m.city).filter(Boolean) as string[]);
    return Array.from(uniqueCities).sort();
  }, [membersWithEmail]);

  // For "all" selection type, use filtered members count
  const activeMembers = recipientFilters.status === "all" || recipientFilters.status === "active"
    ? filteredMembers.filter((m) => m.is_active)
    : filteredMembers;

  const handleSendNow = async (mailingId: string) => {
    setIsSending(true);
    try {
      // First save any pending changes before sending
      const scheduledAt = getScheduledDateTime();
      const saveData = {
        title: formData.title,
        template_id: formData.template_id || null,
        selection_type: formData.selection_type,
        selected_member_ids: formData.selection_type === "manual" ? formData.selected_member_ids : [],
        scheduled_at: scheduledAt,
      };

      const { error: saveError } = await supabase
        .from("mailings")
        .update(saveData)
        .eq("id", mailingId);

      if (saveError) throw saveError;

      // Now send the mailing
      const { data, error } = await supabase.functions.invoke("send-mailing", {
        body: { mailingId },
      });

      if (error) throw error;

      if (data.success) {
        toast.success(`Mailing verzonden naar ${data.sent} ontvangers`);
        if (data.failed > 0) {
          toast.warning(`${data.failed} e-mails konden niet worden verzonden`);
        }
        refetch();
        // Go back to list after successful send
        setSelectedMailing(null);
        setIsCreating(false);
      } else {
        throw new Error(data.error || "Onbekende fout");
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Fout bij versturen mailing";
      toast.error(message);
    } finally {
      setIsSending(false);
    }
  };

  const handleCreate = () => {
    setIsCreating(true);
    setSelectedMailing(null);
    setMemberSearch("");
    setRecipientFilters({
      status: "all",
      companyId: "all",
      city: "all",
      membershipType: "all",
    });
    setFormData({
      title: "",
      template_id: "",
      selection_type: "all",
      selected_member_ids: [],
      scheduled_at: null,
      scheduled_time: "09:00",
    });
  };

  const handleEdit = (mailing: Mailing) => {
    setSelectedMailing(mailing);
    setIsCreating(false);
    const scheduledDate = mailing.scheduled_at ? new Date(mailing.scheduled_at) : null;
    setFormData({
      title: mailing.title,
      template_id: mailing.template_id || "",
      selection_type: mailing.selection_type,
      selected_member_ids: mailing.selected_member_ids || [],
      scheduled_at: scheduledDate,
      scheduled_time: scheduledDate ? format(scheduledDate, "HH:mm") : "09:00",
    });
  };

  const handleBack = () => {
    setSelectedMailing(null);
    setIsCreating(false);
  };

  const toggleMember = (memberId: string) => {
    setFormData((prev) => ({
      ...prev,
      selected_member_ids: prev.selected_member_ids.includes(memberId)
        ? prev.selected_member_ids.filter((id) => id !== memberId)
        : [...prev.selected_member_ids, memberId],
    }));
  };

  const selectAllFilteredMembers = () => {
    setFormData((prev) => ({
      ...prev,
      selected_member_ids: [...new Set([...prev.selected_member_ids, ...filteredMembers.map((m) => m.id)])],
    }));
  };

  const deselectAllMembers = () => {
    setFormData((prev) => ({
      ...prev,
      selected_member_ids: [],
    }));
  };

  const selectAllMembers = () => {
    setFormData((prev) => ({
      ...prev,
      selected_member_ids: membersWithEmail.filter((m) => m.is_active).map((m) => m.id),
    }));
  };


  const getScheduledDateTime = () => {
    if (!formData.scheduled_at) return null;
    const [hours, minutes] = formData.scheduled_time.split(":").map(Number);
    const dateTime = new Date(formData.scheduled_at);
    dateTime.setHours(hours, minutes, 0, 0);
    return dateTime.toISOString();
  };

  const handleSave = (asDraft = true) => {
    const scheduledAt = getScheduledDateTime();
    const data = {
      title: formData.title,
      template_id: formData.template_id || null,
      selection_type: formData.selection_type,
      selected_member_ids: formData.selection_type === "manual" ? formData.selected_member_ids : [],
      scheduled_at: scheduledAt,
      status: (asDraft ? "draft" : scheduledAt ? "scheduled" : "draft") as "draft" | "scheduled",
    };

    if (isCreating) {
      createMailing.mutate(data, {
        onSuccess: (newMailing) => {
          // Stay on edit screen with the newly created mailing
          setIsCreating(false);
          setSelectedMailing(newMailing as Mailing);
        },
      });
    } else if (selectedMailing) {
      updateMailing.mutate(
        { id: selectedMailing.id, data },
        {
          onSuccess: () => {
            // Stay on edit screen, update the selectedMailing with new data
            setSelectedMailing((prev) => prev ? { ...prev, ...data } as Mailing : null);
          },
        }
      );
    }
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
  if (isCreating || selectedMailing) {
    const recipientCount =
      formData.selection_type === "all" 
        ? membersWithEmail.filter((m) => m.is_active).length 
        : formData.selected_member_ids.length;

    return (
      <MainLayout>
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={handleBack}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                {isCreating ? "Nieuwe Mailing" : "Mailing bewerken"}
              </h1>
              <p className="text-muted-foreground">
                {isCreating ? "Stel een nieuwe mailing samen" : `Bewerk "${selectedMailing?.title}"`}
              </p>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-6">
              {/* Basic Info */}
              <Card>
                <CardHeader>
                  <CardTitle>Basis gegevens</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Titel</Label>
                    <Input
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="bijv. Nieuwsbrief januari 2024"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Template</Label>
                    <Select
                      value={formData.template_id}
                      onValueChange={(value) => setFormData({ ...formData, template_id: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Kies een template" />
                      </SelectTrigger>
                      <SelectContent>
                        {templates?.map((template) => (
                          <SelectItem key={template.id} value={template.id}>
                            {template.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              {/* Recipients */}
              <Card>
                <CardHeader>
                  <CardTitle>Ontvangers</CardTitle>
                  <CardDescription>Kies wie deze mailing ontvangt</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <RadioGroup
                    value={formData.selection_type}
                    onValueChange={(value: "all" | "manual") =>
                      setFormData({ ...formData, selection_type: value })
                    }
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="all" id="all" />
                      <Label htmlFor="all" className="font-normal">
                        Alle actieve leden met e-mailadres ({membersWithEmail.filter((m) => m.is_active).length} leden)
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="manual" id="manual" />
                      <Label htmlFor="manual" className="font-normal">
                        Gefilterde selectie
                      </Label>
                    </div>
                  </RadioGroup>

                  {formData.selection_type === "manual" && (
                    <div className="space-y-4 pt-4">
                      {/* Filters */}
                      <RecipientFilters
                        filters={recipientFilters}
                        onFiltersChange={setRecipientFilters}
                        companies={companies}
                        cities={cities}
                      />

                      {/* Search */}
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          placeholder="Zoek op naam, e-mail of stad..."
                          value={memberSearch}
                          onChange={(e) => setMemberSearch(e.target.value)}
                          className="pl-10"
                        />
                      </div>

                      {/* Selection controls */}
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">
                          {formData.selected_member_ids.length} geselecteerd van {filteredMembers.length} gefilterde leden
                        </span>
                        <div className="flex gap-2 flex-wrap">
                          <Button variant="outline" size="sm" onClick={selectAllFilteredMembers}>
                            Gefilterde selecteren ({filteredMembers.length})
                          </Button>
                          <Button variant="outline" size="sm" onClick={selectAllMembers}>
                            Alle actieve
                          </Button>
                          <Button variant="outline" size="sm" onClick={deselectAllMembers}>
                            Niets
                          </Button>
                        </div>
                      </div>

                      {/* Member list */}
                      <ScrollArea className="h-[300px] border rounded-lg p-4">
                        <div className="space-y-2">
                          {filteredMembers.length === 0 ? (
                            <p className="text-sm text-muted-foreground text-center py-4">
                              Geen leden gevonden met de huidige filters
                            </p>
                          ) : (
                            filteredMembers.map((member) => (
                              <div
                                key={member.id}
                                className="flex items-center space-x-3 py-2 border-b last:border-0"
                              >
                                <Checkbox
                                  id={member.id}
                                  checked={formData.selected_member_ids.includes(member.id)}
                                  onCheckedChange={() => toggleMember(member.id)}
                                />
                                <Label htmlFor={member.id} className="flex-1 font-normal cursor-pointer">
                                  <div className="flex flex-col sm:flex-row sm:items-center gap-1">
                                    <span className="font-medium">
                                      {member.first_name} {member.last_name}
                                    </span>
                                    <span className="text-muted-foreground text-sm">{member.email}</span>
                                    {member.city && (
                                      <Badge variant="outline" className="text-xs w-fit">
                                        {member.city}
                                      </Badge>
                                    )}
                                    {!member.is_active && (
                                      <Badge variant="secondary" className="text-xs w-fit">
                                        Inactief
                                      </Badge>
                                    )}
                                  </div>
                                </Label>
                              </div>
                            ))
                          )}
                        </div>
                      </ScrollArea>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Schedule */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    Inplannen
                  </CardTitle>
                  <CardDescription>Kies wanneer de mailing verzonden wordt</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-wrap gap-4">
                    <div className="space-y-2">
                      <Label>Datum</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-[240px] justify-start text-left font-normal",
                              !formData.scheduled_at && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {formData.scheduled_at ? (
                              format(formData.scheduled_at, "PPP", { locale: nl })
                            ) : (
                              "Kies een datum"
                            )}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={formData.scheduled_at || undefined}
                            onSelect={(date) => setFormData({ ...formData, scheduled_at: date || null })}
                            disabled={(date) => date < new Date()}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div className="space-y-2">
                      <Label>Tijd</Label>
                      <Input
                        type="time"
                        value={formData.scheduled_time}
                        onChange={(e) => setFormData({ ...formData, scheduled_time: e.target.value })}
                        className="w-[140px]"
                      />
                    </div>
                  </div>
                  {formData.scheduled_at && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setFormData({ ...formData, scheduled_at: null })}
                    >
                      Planning wissen
                    </Button>
                  )}
                </CardContent>
              </Card>

              {/* Actions */}
              <div className="flex gap-2 flex-wrap">
                <Button variant="outline" onClick={() => handleSave(true)}>
                  Als concept opslaan
                </Button>
                <Button
                  onClick={() => handleSave(false)}
                  disabled={!formData.title || !formData.template_id || recipientCount === 0}
                >
                  {formData.scheduled_at ? (
                    <>
                      <Clock className="h-4 w-4 mr-2" />
                      Inplannen
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Opslaan
                    </>
                  )}
                </Button>
                {selectedMailing && selectedMailing.status !== "sent" && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button 
                        variant="default"
                        disabled={!formData.title || !formData.template_id || recipientCount === 0 || isSending}
                      >
                        {isSending ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Send className="h-4 w-4 mr-2" />
                        )}
                        Nu versturen ({recipientCount})
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent key={`send-dialog-${recipientCount}`}>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Mailing nu versturen?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Deze mailing wordt direct verzonden naar {recipientCount} ontvangers. Dit kan niet ongedaan worden gemaakt.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Annuleren</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleSendNow(selectedMailing.id)}>
                          Versturen
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
                <Button variant="ghost" onClick={handleBack}>
                  Annuleren
                </Button>
              </div>
            </div>

            {/* Summary sidebar */}
            <Card>
              <CardHeader>
                <CardTitle>Samenvatting</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span>{recipientCount} ontvangers</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span>
                      {formData.template_id
                        ? templates?.find((t) => t.id === formData.template_id)?.name || "Template"
                        : "Geen template"}
                    </span>
                  </div>
                  {formData.scheduled_at && (
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span>
                        {format(formData.scheduled_at, "d MMM yyyy", { locale: nl })} om{" "}
                        {formData.scheduled_time}
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </MainLayout>
    );
  }

  // Show list view
  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Mailings</h1>
            <p className="text-muted-foreground">Beheer en verstuur mailings naar leden</p>
          </div>
          <Button onClick={handleCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Nieuwe mailing
          </Button>
        </div>

        <Card>
          <CardContent className="p-0">
            {mailings?.length === 0 ? (
              <div className="text-center py-12">
                <Mail className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">Geen mailings</h3>
                <p className="text-muted-foreground mb-4">
                  Maak je eerste mailing om te beginnen.
                </p>
                <Button onClick={handleCreate}>
                  <Plus className="h-4 w-4 mr-2" />
                  Nieuwe mailing
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Titel</TableHead>
                    <TableHead>Template</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Gepland</TableHead>
                    <TableHead className="w-[100px]">Acties</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mailings?.map((mailing) => {
                    const status = statusLabels[mailing.status] || statusLabels.draft;
                    return (
                      <TableRow
                        key={mailing.id}
                        className="cursor-pointer"
                        onClick={() => handleEdit(mailing)}
                      >
                        <TableCell className="font-medium">{mailing.title}</TableCell>
                        <TableCell>{mailing.template?.name || "-"}</TableCell>
                        <TableCell>
                          <Badge variant={status.variant}>{status.label}</Badge>
                        </TableCell>
                        <TableCell>
                          {mailing.scheduled_at
                            ? format(new Date(mailing.scheduled_at), "d MMM yyyy HH:mm", { locale: nl })
                            : "-"}
                        </TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Mailing verwijderen?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Dit kan niet ongedaan worden gemaakt.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Annuleren</AlertDialogCancel>
                                <AlertDialogAction onClick={() => deleteMailing.mutate(mailing.id)}>
                                  Verwijderen
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
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
