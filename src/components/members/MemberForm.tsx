import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Member } from "@/lib/supabase";
import { useCompanies } from "@/hooks/useCompanies";
import { useAuthContext } from "@/contexts/AuthContext";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCheckEmailExists } from "@/hooks/useMembers";
import { toast } from "sonner";
import { MemberAvatar } from "./MemberAvatar";
import { ProfilePhotoUpload } from "./ProfilePhotoUpload";
import { SocialMediaFields } from "./SocialMediaFields";
import { WebsitePreview } from "./WebsitePreview";
import { MembershipFields } from "./MembershipFields";
import { TagInput } from "./TagInput";
import { Save, User, Building2, MapPin, Globe, Calendar, CreditCard, ShieldCheck, Loader2 } from "lucide-react";

const memberSchema = z.object({
  first_name: z.string().min(1, "Voornaam is verplicht"),
  last_name: z.string().min(1, "Achternaam is verplicht"),
  email: z.string().email("Ongeldig e-mailadres").optional().or(z.literal("")),
  phone: z.string().optional(),
  mobile: z.string().optional(),
  address: z.string().optional(),
  postal_code: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  personal_url: z.string().url("Ongeldige URL").optional().or(z.literal("")),
  company_id: z.string().optional(),
  notes: z.string().optional(),
  is_active: z.boolean(),
  profile_photo_url: z.string().optional(),
  facebook_url: z.string().url("Ongeldige URL").optional().or(z.literal("")),
  linkedin_url: z.string().url("Ongeldige URL").optional().or(z.literal("")),
  instagram_url: z.string().url("Ongeldige URL").optional().or(z.literal("")),
  tiktok_url: z.string().url("Ongeldige URL").optional().or(z.literal("")),
  bank_account: z.string().optional(),
  member_since: z.string().optional(),
  receives_mail: z.boolean(),
  is_board_member: z.boolean(),
  is_active_member: z.boolean(),
  is_ambassador: z.boolean(),
  is_donor: z.boolean(),
  is_council_member: z.boolean(),
});

type MemberFormData = z.infer<typeof memberSchema>;

interface MemberFormProps {
  member?: Member | null;
  onSubmit: (data: MemberFormData) => void;
  isLoading?: boolean;
  onDirtyChange?: (isDirty: boolean) => void;
}

export function MemberForm({ member, onSubmit, isLoading, onDirtyChange }: MemberFormProps) {
  const { data: companies = [] } = useCompanies();
  const { isAdmin: currentUserIsAdmin, user } = useAuthContext();
  const queryClient = useQueryClient();
  const [photoUrl, setPhotoUrl] = useState<string | null>(member?.profile_photo_url || null);
  const [isUpdatingRole, setIsUpdatingRole] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const checkEmailExists = useCheckEmailExists();
  
  const isOwnAccount = user?.id === member?.auth_user_id;
  const canCreateAccount = !!member?.email;
  const isExistingMember = !!member?.id;

  const form = useForm<MemberFormData>({
    resolver: zodResolver(memberSchema),
    defaultValues: {
      first_name: member?.first_name || "",
      last_name: member?.last_name || "",
      email: member?.email || "",
      phone: member?.phone || "",
      mobile: member?.mobile || "",
      address: member?.address || "",
      postal_code: member?.postal_code || "",
      city: member?.city || "",
      country: member?.country || "België",
      personal_url: member?.personal_url || "",
      company_id: member?.company_id || "",
      notes: member?.notes || "",
      is_active: member?.is_active ?? true,
      profile_photo_url: member?.profile_photo_url || "",
      facebook_url: member?.facebook_url || "",
      linkedin_url: member?.linkedin_url || "",
      instagram_url: member?.instagram_url || "",
      tiktok_url: member?.tiktok_url || "",
      bank_account: member?.bank_account || "",
      member_since: member?.member_since || "",
      receives_mail: member?.receives_mail ?? true,
      is_board_member: member?.is_board_member ?? false,
      is_active_member: member?.is_active_member ?? true,
      is_ambassador: member?.is_ambassador ?? false,
      is_donor: member?.is_donor ?? false,
      is_council_member: member?.is_council_member ?? false,
    },
  });

  // Track dirty state
  const { isDirty } = form.formState;
  
  useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);
  useEffect(() => {
    if (member) {
      form.reset({
        first_name: member.first_name || "",
        last_name: member.last_name || "",
        email: member.email || "",
        phone: member.phone || "",
        mobile: member.mobile || "",
        address: member.address || "",
        postal_code: member.postal_code || "",
        city: member.city || "",
        country: member.country || "België",
        personal_url: member.personal_url || "",
        company_id: member.company_id || "",
        notes: member.notes || "",
        is_active: member.is_active ?? true,
        profile_photo_url: member.profile_photo_url || "",
        facebook_url: member.facebook_url || "",
        linkedin_url: member.linkedin_url || "",
        instagram_url: member.instagram_url || "",
        tiktok_url: member.tiktok_url || "",
        bank_account: member.bank_account || "",
        member_since: member.member_since || "",
        receives_mail: member.receives_mail ?? true,
        is_board_member: member.is_board_member ?? false,
        is_active_member: member.is_active_member ?? true,
        is_ambassador: member.is_ambassador ?? false,
        is_donor: member.is_donor ?? false,
        is_council_member: member.is_council_member ?? false,
      });
      setPhotoUrl(member.profile_photo_url);
    }
  }, [member, form]);

  const handlePhotoChange = (url: string | null) => {
    setPhotoUrl(url);
    form.setValue("profile_photo_url", url || "");
  };

  // Check for duplicate email when email field loses focus
  const handleEmailBlur = async (email: string) => {
    setEmailError(null);
    if (!email) return;
    
    try {
      const existing = await checkEmailExists.mutateAsync({ 
        email, 
        excludeMemberId: member?.id 
      });
      
      if (existing) {
        setEmailError(`Dit e-mailadres is al in gebruik door ${existing.first_name} ${existing.last_name}`);
      }
    } catch (error) {
      console.error("Error checking email:", error);
    }
  };

  const handleSubmit = async (data: MemberFormData) => {
    // Check for duplicate email before submitting
    if (data.email) {
      const existing = await checkEmailExists.mutateAsync({ 
        email: data.email, 
        excludeMemberId: member?.id 
      });
      
      if (existing) {
        setEmailError(`Dit e-mailadres is al in gebruik door ${existing.first_name} ${existing.last_name}`);
        toast.error("Dit e-mailadres is al in gebruik");
        return;
      }
    }
    
    // Convert empty strings to null/undefined for optional fields
    const cleanedData = {
      ...data,
      profile_photo_url: photoUrl || undefined,
      company_id: data.company_id || undefined,
      email: data.email || undefined,
      phone: data.phone || undefined,
      mobile: data.mobile || undefined,
      address: data.address || undefined,
      postal_code: data.postal_code || undefined,
      city: data.city || undefined,
      country: data.country || undefined,
      personal_url: data.personal_url || undefined,
      notes: data.notes || undefined,
      facebook_url: data.facebook_url || undefined,
      linkedin_url: data.linkedin_url || undefined,
      instagram_url: data.instagram_url || undefined,
      tiktok_url: data.tiktok_url || undefined,
      bank_account: data.bank_account || undefined,
      member_since: data.member_since || undefined,
    };
    onSubmit(cleanedData);
  };

  // Admin role toggle mutation
  const toggleAdminRole = useMutation({
    mutationFn: async (shouldBeAdmin: boolean) => {
      if (!member?.id) throw new Error("Member ID required");
      
      if (shouldBeAdmin && !member.auth_user_id) {
        // Need to create admin account via edge function
        const { data, error } = await supabase.functions.invoke("create-admin-account", {
          body: { memberId: member.id },
        });
        if (error) throw error;
        if (data?.error) throw new Error(data.error);
        return data;
      } else {
        // Just update the is_admin flag
        const { error: memberError } = await supabase
          .from("members")
          .update({ is_admin: shouldBeAdmin })
          .eq("id", member.id);
        if (memberError) throw memberError;

        // If member has an auth account, also update user_roles
        if (member.auth_user_id) {
          if (shouldBeAdmin) {
            const { error } = await supabase
              .from("user_roles")
              .insert({ user_id: member.auth_user_id, role: "admin" as const });
            if (error && !error.message.includes("duplicate")) throw error;
          } else {
            const { error } = await supabase
              .from("user_roles")
              .delete()
              .eq("user_id", member.auth_user_id)
              .eq("role", "admin");
            if (error) throw error;
          }
        }
        return { success: true, accountCreated: false };
      }
    },
    onMutate: () => setIsUpdatingRole(true),
    onSuccess: (data, shouldBeAdmin) => {
      queryClient.invalidateQueries({ queryKey: ["member", member?.id] });
      queryClient.invalidateQueries({ queryKey: ["members"] });
      queryClient.invalidateQueries({ queryKey: ["admin-user-ids"] });

      if (data?.accountCreated && data.tempPassword) {
        toast.success(`Beheerdersaccount aangemaakt. Wachtwoord: ${data.tempPassword}`);
      } else if (shouldBeAdmin) {
        toast.success("Beheerder-rol toegekend");
      } else {
        toast.success("Beheerder-rol verwijderd");
      }
    },
    onError: (error) => {
      console.error("Error updating role:", error);
      toast.error(error instanceof Error ? error.message : "Fout bij het bijwerken van de rol");
    },
    onSettled: () => setIsUpdatingRole(false),
  });

  const handleAdminToggle = (checked: boolean) => {
    if (!canCreateAccount && checked && !member?.auth_user_id) {
      toast.error("Lid heeft geen e-mailadres. Voeg eerst een e-mailadres toe.");
      return;
    }
    toggleAdminRole.mutate(checked);
  };

  const firstName = form.watch("first_name");
  const lastName = form.watch("last_name");
  const personalUrl = form.watch("personal_url");

  return (
    <Form {...form}>
      <form id="member-form" onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Profile Photo Section */}
          <Card className="lg:col-span-1 card-elevated">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <User className="h-5 w-5 text-primary" />
                Profielfoto
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-4">
              <MemberAvatar
                firstName={firstName || "N"}
                lastName={lastName || "N"}
                photoUrl={photoUrl}
                size="lg"
              />
              <ProfilePhotoUpload
                currentUrl={photoUrl}
                onUpload={handlePhotoChange}
                memberId={member?.id}
              />
            </CardContent>
          </Card>

          {/* Personal Info */}
          <Card className="lg:col-span-2 card-elevated">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <User className="h-5 w-5 text-primary" />
                Persoonlijke gegevens
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="first_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Voornaam *</FormLabel>
                    <FormControl>
                      <Input placeholder="Jan" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="last_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Achternaam *</FormLabel>
                    <FormControl>
                      <Input placeholder="Janssen" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>E-mail</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="jan@voorbeeld.be"
                        {...field}
                        onBlur={(e) => {
                          field.onBlur();
                          handleEmailBlur(e.target.value);
                        }}
                        onChange={(e) => {
                          field.onChange(e);
                          setEmailError(null);
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                    {emailError && (
                      <p className="text-sm font-medium text-destructive">{emailError}</p>
                    )}
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Telefoon</FormLabel>
                    <FormControl>
                      <Input placeholder="+32 2 123 45 67" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="mobile"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mobiel</FormLabel>
                    <FormControl>
                      <Input placeholder="+32 470 12 34 56" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="personal_url"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Persoonlijke URL</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="https://www.mijnwebsite.be"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Address */}
          <Card className="lg:col-span-2 card-elevated">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <MapPin className="h-5 w-5 text-primary" />
                Adresgegevens
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel>Straat en huisnummer</FormLabel>
                    <FormControl>
                      <Input placeholder="Hoofdstraat 123" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="postal_code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Postcode</FormLabel>
                    <FormControl>
                      <Input placeholder="1000" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Stad</FormLabel>
                    <FormControl>
                      <Input placeholder="Brussel" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="country"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Land</FormLabel>
                    <FormControl>
                      <Input placeholder="België" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Bank Account + Admin Toggle */}
          <Card className="lg:col-span-1 card-elevated">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <CreditCard className="h-5 w-5 text-primary" />
                Financieel
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="bank_account"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bankrekeningnummer (IBAN)</FormLabel>
                    <FormControl>
                      <Input placeholder="BE12 3456 7890 1234" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Admin toggle - only visible to admins for existing members */}
              {currentUserIsAdmin && isExistingMember && (
                <div className="pt-4 border-t">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="admin-role" className="text-sm font-medium flex items-center gap-2">
                        <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                        Beheerder
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Toegang tot ledenbeheer en instellingen
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {isUpdatingRole && <Loader2 className="h-4 w-4 animate-spin" />}
                      <Switch
                        id="admin-role"
                        checked={member?.is_admin ?? false}
                        onCheckedChange={handleAdminToggle}
                        disabled={isUpdatingRole || isOwnAccount}
                      />
                    </div>
                  </div>
                  {isOwnAccount && (
                    <p className="text-xs text-amber-600 mt-2">
                      Je kunt je eigen beheerder-rol niet wijzigen.
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
          <Card className="lg:col-span-1 card-elevated">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Building2 className="h-5 w-5 text-primary" />
                Organisatie
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="member_since"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Lid sinds
                    </FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="company_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bedrijf</FormLabel>
                    <Select
                      onValueChange={(value) => field.onChange(value === "none" ? "" : value)}
                      value={field.value || "none"}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecteer bedrijf" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">Geen bedrijf</SelectItem>
                        {companies.map((company) => (
                          <SelectItem key={company.id} value={company.id}>
                            {company.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="is_active"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-3">
                    <FormLabel className="cursor-pointer">Actief</FormLabel>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Membership toggles */}
          <div className="lg:col-span-2">
            <MembershipFields control={form.control} />
          </div>

          {/* Tags */}
          <div className="lg:col-span-1">
            <TagInput memberId={member?.id} disabled={isLoading} />
          </div>

          {/* Social Media */}
          <div className="lg:col-span-2">
            <SocialMediaFields control={form.control} />
          </div>

          {/* Website Preview */}
          <div className="lg:col-span-1">
            <WebsitePreview url={personalUrl} />
          </div>

          {/* Notes */}
          <Card className="lg:col-span-3 card-elevated">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Globe className="h-5 w-5 text-primary" />
                Notities
              </CardTitle>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Textarea
                        placeholder="Voeg notities toe over dit lid..."
                        className="min-h-[100px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-end">
          <Button type="submit" disabled={isLoading} className="gap-2">
            <Save className="h-4 w-4" />
            {isLoading ? "Opslaan..." : "Opslaan"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
