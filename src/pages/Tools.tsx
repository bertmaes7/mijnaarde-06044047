import { useState, useMemo } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { OrganizationLogo } from "@/components/layout/OrganizationLogo";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
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
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useMembers, useDuplicateEmails, useBulkUpdateMembers } from "@/hooks/useMembers";
import { useTags, useBulkAddTag, useBulkRemoveTag, useCreateTag } from "@/hooks/useTags";
import { Wrench, AlertTriangle, Users, RefreshCw, Loader2, Shield, Key, Copy, Check, Tag, Plus, Search, X, ChevronDown } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

const BULK_UPDATE_FIELDS = [
  { value: "receives_mail", label: "Ontvangt mail", type: "boolean" },
  { value: "is_active", label: "Actief", type: "boolean" },
  { value: "is_active_member", label: "Actief lid", type: "boolean" },
  { value: "is_board_member", label: "Bestuurslid", type: "boolean" },
  { value: "is_ambassador", label: "Ambassadeur", type: "boolean" },
  { value: "is_donor", label: "Donateur", type: "boolean" },
  { value: "is_council_member", label: "Raadslid", type: "boolean" },
] as const;

// Hook to get admin members
function useAdminMembers() {
  return useQuery({
    queryKey: ["admin-members"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("members")
        .select("id, first_name, last_name, email, auth_user_id, is_admin, password_change_required")
        .eq("is_admin", true)
        .not("auth_user_id", "is", null)
        .order("last_name", { ascending: true });
      
      if (error) throw error;
      return data;
    },
  });
}

// Hook to reset admin password
function useResetAdminPassword() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (memberId: string) => {
      const { data, error } = await supabase.functions.invoke("reset-admin-password", {
        body: { memberId },
      });
      
      if (error) throw error;
      if (data.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-members"] });
    },
  });
}

export default function Tools() {
  const { data: members = [], isLoading: membersLoading } = useMembers();
  const { data: duplicates = [], isLoading: duplicatesLoading, refetch: refetchDuplicates } = useDuplicateEmails();
  const { data: adminMembers = [], isLoading: adminsLoading, refetch: refetchAdmins } = useAdminMembers();
  const { data: allTags = [], isLoading: tagsLoading } = useTags();
  const bulkUpdate = useBulkUpdateMembers();
  const bulkAddTag = useBulkAddTag();
  const bulkRemoveTag = useBulkRemoveTag();
  const createTag = useCreateTag();
  const resetPassword = useResetAdminPassword();

  // Bulk update state
  const [selectedMemberIds, setSelectedMemberIds] = useState<Set<string>>(new Set());
  const [selectedField, setSelectedField] = useState<string>("");
  const [selectedValue, setSelectedValue] = useState<string>("");
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  
  // Search and filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [filterTagIds, setFilterTagIds] = useState<string[]>([]);
  const [tagPopoverOpen, setTagPopoverOpen] = useState(false);
  const [tagInputValue, setTagInputValue] = useState("");
  
  // Tag bulk action state
  const [tagActionType, setTagActionType] = useState<"add" | "remove">("add");
  const [selectedTagId, setSelectedTagId] = useState<string>("");
  const [showTagConfirmDialog, setShowTagConfirmDialog] = useState(false);
  const [newTagInputValue, setNewTagInputValue] = useState("");
  const [actionTagPopoverOpen, setActionTagPopoverOpen] = useState(false);
  
  // Password reset state
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [resetResult, setResetResult] = useState<{ email: string; tempPassword: string } | null>(null);
  const [copiedPassword, setCopiedPassword] = useState(false);
  const [confirmResetMemberId, setConfirmResetMemberId] = useState<string | null>(null);
  const [confirmResetName, setConfirmResetName] = useState<string>("");

  // Filter members based on search and tags
  const filteredMembers = useMemo(() => {
    return members.filter(member => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const fullName = `${member.first_name} ${member.last_name}`.toLowerCase();
        const email = member.email?.toLowerCase() || "";
        if (!fullName.includes(query) && !email.includes(query)) {
          return false;
        }
      }
      
      // Tag filter - member must have ANY selected tag (OR logic)
      if (filterTagIds.length > 0) {
        const memberTagIds = member.member_tags?.map(mt => mt.tag_id) || [];
        const hasAnyTag = filterTagIds.some(tagId => memberTagIds.includes(tagId));
        if (!hasAnyTag) return false;
      }
      
      return true;
    });
  }, [members, searchQuery, filterTagIds]);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedMemberIds(new Set(filteredMembers.map(m => m.id)));
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

  const handleBulkTagAction = () => {
    if (selectedMemberIds.size === 0) {
      toast.error("Selecteer minstens één lid");
      return;
    }
    if (!selectedTagId && tagActionType === "remove") {
      toast.error("Selecteer een tag");
      return;
    }
    if (!selectedTagId && !newTagInputValue.trim() && tagActionType === "add") {
      toast.error("Selecteer of maak een tag");
      return;
    }
    setShowTagConfirmDialog(true);
  };

  const confirmBulkTagAction = async () => {
    let tagId = selectedTagId;
    
    // Create new tag if needed
    if (!tagId && newTagInputValue.trim() && tagActionType === "add") {
      try {
        const newTag = await createTag.mutateAsync(newTagInputValue.trim());
        tagId = newTag.id;
      } catch (error) {
        toast.error("Fout bij aanmaken tag");
        setShowTagConfirmDialog(false);
        return;
      }
    }
    
    if (!tagId) {
      toast.error("Geen tag geselecteerd");
      setShowTagConfirmDialog(false);
      return;
    }
    
    if (tagActionType === "add") {
      await bulkAddTag.mutateAsync({
        memberIds: Array.from(selectedMemberIds),
        tagId,
      });
    } else {
      await bulkRemoveTag.mutateAsync({
        memberIds: Array.from(selectedMemberIds),
        tagId,
      });
    }
    
    setShowTagConfirmDialog(false);
    setSelectedMemberIds(new Set());
    setSelectedTagId("");
    setNewTagInputValue("");
  };

  const handleResetPassword = (memberId: string, name: string) => {
    setConfirmResetMemberId(memberId);
    setConfirmResetName(name);
  };

  const confirmResetPassword = async () => {
    if (!confirmResetMemberId) return;
    
    try {
      const result = await resetPassword.mutateAsync(confirmResetMemberId);
      setResetResult({ email: result.email, tempPassword: result.tempPassword });
      setResetDialogOpen(true);
      toast.success("Wachtwoord succesvol gereset");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Fout bij resetten wachtwoord");
    } finally {
      setConfirmResetMemberId(null);
      setConfirmResetName("");
    }
  };

  const copyPassword = async () => {
    if (resetResult?.tempPassword) {
      await navigator.clipboard.writeText(resetResult.tempPassword);
      setCopiedPassword(true);
      setTimeout(() => setCopiedPassword(false), 2000);
    }
  };

  const selectedFieldLabel = BULK_UPDATE_FIELDS.find(f => f.value === selectedField)?.label || selectedField;

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <OrganizationLogo size="lg" className="hidden sm:flex rounded-lg border bg-white p-1" />
          <div>
            <h1 className="font-display text-3xl font-bold text-foreground flex items-center gap-2">
              <Wrench className="h-8 w-8 text-primary" />
              Tools
            </h1>
            <p className="text-muted-foreground">
              Beheertools voor onderhoud en bulk-operaties
            </p>
          </div>
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
              Werk velden of tags bij voor meerdere leden tegelijk
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Search and Filter */}
            <div className="flex flex-wrap gap-3 items-center">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Zoek op naam of e-mail..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              {/* Tag Filter */}
              <div className="flex items-center gap-2 flex-wrap">
                {filterTagIds.map((tagId) => {
                  const tag = allTags.find(t => t.id === tagId);
                  return tag ? (
                    <Badge key={tagId} variant="secondary" className="gap-1 pr-1">
                      {tag.name}
                      <button
                        type="button"
                        onClick={() => setFilterTagIds(filterTagIds.filter(id => id !== tagId))}
                        className="ml-1 hover:bg-muted rounded p-0.5"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ) : null;
                })}
                <Popover open={tagPopoverOpen} onOpenChange={setTagPopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="h-8 gap-1">
                      {tagsLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Tag className="h-3 w-3" />}
                      Filter op tags
                      <ChevronDown className="h-3 w-3 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-56 p-0" align="start">
                    <Command>
                      <CommandInput
                        placeholder="Zoek tag..."
                        value={tagInputValue}
                        onValueChange={setTagInputValue}
                      />
                      <CommandList>
                        <CommandEmpty>Geen tags gevonden</CommandEmpty>
                        <CommandGroup>
                          {allTags
                            .filter(t => !filterTagIds.includes(t.id))
                            .filter(t => t.name.toLowerCase().includes(tagInputValue.toLowerCase()))
                            .map((tag) => (
                              <CommandItem
                                key={tag.id}
                                value={tag.name}
                                onSelect={() => {
                                  setFilterTagIds([...filterTagIds, tag.id]);
                                  setTagPopoverOpen(false);
                                  setTagInputValue("");
                                }}
                              >
                                <Tag className="h-4 w-4 mr-2 text-muted-foreground" />
                                {tag.name}
                              </CommandItem>
                            ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                
                {(searchQuery || filterTagIds.length > 0) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSearchQuery("");
                      setFilterTagIds([]);
                    }}
                    className="h-8 gap-1 text-muted-foreground"
                  >
                    <X className="h-3 w-3" />
                    Wis filters
                  </Button>
                )}
              </div>
            </div>
            
            {/* Boolean Field Controls */}
            <div className="flex flex-wrap gap-4 items-end border-t pt-4">
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
                Bijwerken ({selectedMemberIds.size})
              </Button>
            </div>

            {/* Tag Action Controls */}
            <div className="flex flex-wrap gap-4 items-end border-t pt-4">
              <div className="space-y-2">
                <Label>Tag actie</Label>
                <Select value={tagActionType} onValueChange={(v: "add" | "remove") => setTagActionType(v)}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="add">Tag toevoegen</SelectItem>
                    <SelectItem value="remove">Tag verwijderen</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Tag</Label>
                <Popover open={actionTagPopoverOpen} onOpenChange={setActionTagPopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-48 justify-between">
                      {selectedTagId ? allTags.find(t => t.id === selectedTagId)?.name : 
                        newTagInputValue ? `"${newTagInputValue}" (nieuw)` : "Selecteer tag..."}
                      <ChevronDown className="h-4 w-4 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-56 p-0" align="start">
                    <Command>
                      <CommandInput
                        placeholder="Zoek of maak tag..."
                        value={newTagInputValue}
                        onValueChange={(v) => {
                          setNewTagInputValue(v);
                          setSelectedTagId("");
                        }}
                      />
                      <CommandList>
                        <CommandEmpty>
                          {tagActionType === "add" && newTagInputValue.trim() ? (
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedTagId("");
                                setActionTagPopoverOpen(false);
                              }}
                              className="flex items-center gap-2 w-full px-2 py-1.5 text-sm hover:bg-accent rounded cursor-pointer"
                            >
                              <Plus className="h-4 w-4" />
                              "{newTagInputValue}" aanmaken
                            </button>
                          ) : (
                            <span className="text-muted-foreground">Geen tags gevonden</span>
                          )}
                        </CommandEmpty>
                        <CommandGroup>
                          {allTags
                            .filter(t => t.name.toLowerCase().includes(newTagInputValue.toLowerCase()))
                            .map((tag) => (
                              <CommandItem
                                key={tag.id}
                                value={tag.name}
                                onSelect={() => {
                                  setSelectedTagId(tag.id);
                                  setNewTagInputValue("");
                                  setActionTagPopoverOpen(false);
                                }}
                              >
                                <Tag className="h-4 w-4 mr-2 text-muted-foreground" />
                                {tag.name}
                              </CommandItem>
                            ))}
                          {tagActionType === "add" && newTagInputValue.trim() && 
                            !allTags.some(t => t.name.toLowerCase() === newTagInputValue.toLowerCase()) && (
                            <CommandItem
                              value={`create-${newTagInputValue}`}
                              onSelect={() => {
                                setSelectedTagId("");
                                setActionTagPopoverOpen(false);
                              }}
                              className="text-primary"
                            >
                              <Plus className="h-4 w-4 mr-2" />
                              "{newTagInputValue}" aanmaken
                            </CommandItem>
                          )}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              <Button
                onClick={handleBulkTagAction}
                disabled={bulkAddTag.isPending || bulkRemoveTag.isPending || selectedMemberIds.size === 0}
                variant={tagActionType === "remove" ? "destructive" : "default"}
              >
                {(bulkAddTag.isPending || bulkRemoveTag.isPending) && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {tagActionType === "add" ? "Tag toevoegen" : "Tag verwijderen"} ({selectedMemberIds.size})
              </Button>
            </div>

            {/* Members Table */}
            <div className="border rounded-lg max-h-96 overflow-y-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-background">
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={selectedMemberIds.size === filteredMembers.length && filteredMembers.length > 0}
                        onCheckedChange={handleSelectAll}
                      />
                    </TableHead>
                    <TableHead>Naam</TableHead>
                    <TableHead>E-mail</TableHead>
                    <TableHead>Tags</TableHead>
                    <TableHead>Ontvangt mail</TableHead>
                    <TableHead>Actief</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {membersLoading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                      </TableCell>
                    </TableRow>
                  ) : filteredMembers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        Geen leden gevonden
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredMembers.map((member) => (
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
                          <div className="flex flex-wrap gap-1">
                            {member.member_tags?.map((mt) => (
                              <Badge key={mt.tag_id} variant="outline" className="text-xs">
                                {mt.tag?.name}
                              </Badge>
                            ))}
                          </div>
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
            
            <div className="text-sm text-muted-foreground">
              {filteredMembers.length} van {members.length} leden weergegeven
              {selectedMemberIds.size > 0 && ` • ${selectedMemberIds.size} geselecteerd`}
            </div>
          </CardContent>
        </Card>

        {/* Admin Management Section */}
        <Card className="card-elevated">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Shield className="h-5 w-5 text-primary" />
                  Beheerders
                </CardTitle>
                <CardDescription>
                  Overzicht van alle beheerders en wachtwoordbeheer
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="default"
                  size="sm"
                  asChild
                >
                  <Link to="/change-password">
                    <Key className="h-4 w-4 mr-2" />
                    Mijn wachtwoord wijzigen
                  </Link>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => refetchAdmins()}
                  disabled={adminsLoading}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${adminsLoading ? "animate-spin" : ""}`} />
                  Vernieuwen
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Naam</TableHead>
                    <TableHead>E-mail</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actie</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {adminsLoading ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                      </TableCell>
                    </TableRow>
                  ) : adminMembers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                        Geen beheerders gevonden
                      </TableCell>
                    </TableRow>
                  ) : (
                    adminMembers.map((admin) => (
                      <TableRow key={admin.id}>
                        <TableCell className="font-medium">
                          <Link to={`/members/${admin.id}`} className="text-primary hover:underline">
                            {admin.first_name} {admin.last_name}
                          </Link>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {admin.email}
                        </TableCell>
                        <TableCell>
                          {admin.password_change_required ? (
                            <Badge variant="outline" className="text-amber-600 border-amber-300">
                              Wachtwoord wijzigen vereist
                            </Badge>
                          ) : (
                            <Badge variant="default" className="bg-green-600">
                              Actief
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleResetPassword(admin.id, `${admin.first_name} ${admin.last_name}`)}
                            disabled={resetPassword.isPending}
                          >
                            <Key className="h-4 w-4 mr-2" />
                            Reset wachtwoord
                          </Button>
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

      {/* Confirmation Dialog for Bulk Update */}
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

      {/* Confirmation Dialog for Tag Action */}
      <AlertDialog open={showTagConfirmDialog} onOpenChange={setShowTagConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tag {tagActionType === "add" ? "toevoegen" : "verwijderen"} bevestigen</AlertDialogTitle>
            <AlertDialogDescription>
              Je staat op het punt om de tag "{selectedTagId ? allTags.find(t => t.id === selectedTagId)?.name : newTagInputValue}" 
              {tagActionType === "add" ? " toe te voegen aan" : " te verwijderen van"} {selectedMemberIds.size} leden.
              <br /><br />
              Deze actie kan niet ongedaan worden gemaakt.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuleren</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmBulkTagAction}
              className={tagActionType === "remove" ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : ""}
            >
              {(bulkAddTag.isPending || bulkRemoveTag.isPending || createTag.isPending) && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {tagActionType === "add" ? "Toevoegen" : "Verwijderen"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirmation Dialog for Password Reset */}
      <AlertDialog open={!!confirmResetMemberId} onOpenChange={(open) => !open && setConfirmResetMemberId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Wachtwoord resetten</AlertDialogTitle>
            <AlertDialogDescription>
              Weet je zeker dat je het wachtwoord van <strong>{confirmResetName}</strong> wilt resetten?
              <br /><br />
              Er wordt een nieuw tijdelijk wachtwoord aangemaakt dat bij de volgende inlog moet worden gewijzigd.
              Het nieuwe wachtwoord wordt ook per e-mail verstuurd.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuleren</AlertDialogCancel>
            <AlertDialogAction onClick={confirmResetPassword} disabled={resetPassword.isPending}>
              {resetPassword.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Wachtwoord resetten
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog showing new password */}
      <Dialog open={resetDialogOpen} onOpenChange={(open) => {
        setResetDialogOpen(open);
        if (!open) {
          setResetResult(null);
          setCopiedPassword(false);
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Wachtwoord gereset</DialogTitle>
            <DialogDescription>
              Het wachtwoord is succesvol gereset. Het nieuwe tijdelijke wachtwoord is ook per e-mail verstuurd naar {resetResult?.email}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-muted p-4 rounded-lg">
              <Label className="text-sm text-muted-foreground">Tijdelijk wachtwoord</Label>
              <div className="flex items-center gap-2 mt-1">
                <code className="flex-1 bg-background px-3 py-2 rounded border font-mono text-sm">
                  {resetResult?.tempPassword}
                </code>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={copyPassword}
                >
                  {copiedPassword ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              <strong>Let op:</strong> De gebruiker moet dit wachtwoord wijzigen bij de volgende inlog.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
