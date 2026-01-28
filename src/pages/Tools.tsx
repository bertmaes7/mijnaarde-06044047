import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
} from "@/components/ui/alert-dialog";
import { useMembers, useDuplicateEmails, useBulkUpdateMembers } from "@/hooks/useMembers";
import { Wrench, AlertTriangle, Users, RefreshCw, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

const BULK_UPDATE_FIELDS = [
  { value: "receives_mail", label: "Ontvangt mail", type: "boolean" },
  { value: "is_active", label: "Actief", type: "boolean" },
  { value: "is_active_member", label: "Actief lid", type: "boolean" },
  { value: "is_board_member", label: "Bestuurslid", type: "boolean" },
  { value: "is_ambassador", label: "Ambassadeur", type: "boolean" },
  { value: "is_donor", label: "Donateur", type: "boolean" },
  { value: "is_council_member", label: "Raadslid", type: "boolean" },
] as const;

export default function Tools() {
  const { data: members = [], isLoading: membersLoading } = useMembers();
  const { data: duplicates = [], isLoading: duplicatesLoading, refetch: refetchDuplicates } = useDuplicateEmails();
  const bulkUpdate = useBulkUpdateMembers();

  // Bulk update state
  const [selectedMemberIds, setSelectedMemberIds] = useState<Set<string>>(new Set());
  const [selectedField, setSelectedField] = useState<string>("");
  const [selectedValue, setSelectedValue] = useState<string>("");
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedMemberIds(new Set(members.map(m => m.id)));
    } else {
      setSelectedMemberIds(new Set());
    }
  };

  const handleSelectMember = (memberId: string, checked: boolean) => {
    const newSet = new Set(selectedMemberIds);
    if (checked) {
      newSet.add(memberId);
    } else {
      newSet.delete(memberId);
    }
    setSelectedMemberIds(newSet);
  };

  const handleBulkUpdate = () => {
    if (selectedMemberIds.size === 0) {
      toast.error("Selecteer minstens één lid");
      return;
    }
    if (!selectedField) {
      toast.error("Selecteer een veld om bij te werken");
      return;
    }
    if (!selectedValue) {
      toast.error("Selecteer een waarde");
      return;
    }
    setShowConfirmDialog(true);
  };

  const confirmBulkUpdate = async () => {
    const value = selectedValue === "true";
    await bulkUpdate.mutateAsync({
      memberIds: Array.from(selectedMemberIds),
      field: selectedField,
      value,
    });
    setShowConfirmDialog(false);
    setSelectedMemberIds(new Set());
    setSelectedField("");
    setSelectedValue("");
  };

  const selectedFieldLabel = BULK_UPDATE_FIELDS.find(f => f.value === selectedField)?.label || selectedField;

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground flex items-center gap-2">
            <Wrench className="h-8 w-8 text-primary" />
            Tools
          </h1>
          <p className="text-muted-foreground">
            Beheertools voor onderhoud en bulk-operaties
          </p>
        </div>

        {/* Duplicate Emails Section */}
        <Card className="card-elevated">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <AlertTriangle className="h-5 w-5 text-amber-500" />
                  Dubbele e-mailadressen
                </CardTitle>
                <CardDescription>
                  Leden met hetzelfde e-mailadres (case-insensitive)
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetchDuplicates()}
                disabled={duplicatesLoading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${duplicatesLoading ? "animate-spin" : ""}`} />
                Vernieuwen
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {duplicatesLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : duplicates.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <AlertTriangle className="h-8 w-8 mb-2 text-green-500" />
                <p>Geen dubbele e-mailadressen gevonden</p>
              </div>
            ) : (
              <div className="space-y-4">
                {duplicates.map((dup) => (
                  <div key={dup.email} className="border rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="destructive">{dup.members.length}x</Badge>
                      <span className="font-medium">{dup.email}</span>
                    </div>
                    <div className="grid gap-2 ml-4">
                      {dup.members.map((member) => (
                        <Link
                          key={member.id}
                          to={`/members/${member.id}`}
                          className="text-sm text-primary hover:underline"
                        >
                          {member.first_name} {member.last_name}
                        </Link>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Bulk Update Section */}
        <Card className="card-elevated">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Users className="h-5 w-5 text-primary" />
              Bulk bijwerken
            </CardTitle>
            <CardDescription>
              Werk een veld bij voor meerdere leden tegelijk
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Controls */}
            <div className="flex flex-wrap gap-4 items-end">
              <div className="space-y-2">
                <Label>Veld</Label>
                <Select value={selectedField} onValueChange={setSelectedField}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Selecteer veld" />
                  </SelectTrigger>
                  <SelectContent>
                    {BULK_UPDATE_FIELDS.map((field) => (
                      <SelectItem key={field.value} value={field.value}>
                        {field.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Nieuwe waarde</Label>
                <Select value={selectedValue} onValueChange={setSelectedValue}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="Waarde" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">Ja</SelectItem>
                    <SelectItem value="false">Nee</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button
                onClick={handleBulkUpdate}
                disabled={bulkUpdate.isPending || selectedMemberIds.size === 0}
              >
                {bulkUpdate.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Bijwerken ({selectedMemberIds.size} geselecteerd)
              </Button>
            </div>

            {/* Members Table */}
            <div className="border rounded-lg max-h-96 overflow-y-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-background">
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={selectedMemberIds.size === members.length && members.length > 0}
                        onCheckedChange={handleSelectAll}
                      />
                    </TableHead>
                    <TableHead>Naam</TableHead>
                    <TableHead>E-mail</TableHead>
                    <TableHead>Ontvangt mail</TableHead>
                    <TableHead>Actief</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {membersLoading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                      </TableCell>
                    </TableRow>
                  ) : members.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        Geen leden gevonden
                      </TableCell>
                    </TableRow>
                  ) : (
                    members.map((member) => (
                      <TableRow key={member.id}>
                        <TableCell>
                          <Checkbox
                            checked={selectedMemberIds.has(member.id)}
                            onCheckedChange={(checked) =>
                              handleSelectMember(member.id, checked as boolean)
                            }
                          />
                        </TableCell>
                        <TableCell className="font-medium">
                          {member.first_name} {member.last_name}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {member.email || "-"}
                        </TableCell>
                        <TableCell>
                          <Badge variant={member.receives_mail ? "default" : "secondary"}>
                            {member.receives_mail ? "Ja" : "Nee"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={member.is_active ? "default" : "secondary"}>
                            {member.is_active ? "Ja" : "Nee"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Bulk bijwerken bevestigen</AlertDialogTitle>
            <AlertDialogDescription>
              Je staat op het punt om het veld "{selectedFieldLabel}" op "{selectedValue === "true" ? "Ja" : "Nee"}" te zetten voor {selectedMemberIds.size} leden.
              <br /><br />
              Deze actie kan niet ongedaan worden gemaakt.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuleren</AlertDialogCancel>
            <AlertDialogAction onClick={confirmBulkUpdate}>
              Bijwerken
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MainLayout>
  );
}
