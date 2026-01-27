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
import { Member } from "@/lib/supabase";
import { useCompanies } from "@/hooks/useCompanies";
import { MemberAvatar } from "./MemberAvatar";
import { ProfilePhotoUpload } from "./ProfilePhotoUpload";
import { Save, User, Building2, MapPin, Globe } from "lucide-react";

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
});

type MemberFormData = z.infer<typeof memberSchema>;

interface MemberFormProps {
  member?: Member | null;
  onSubmit: (data: MemberFormData) => void;
  isLoading?: boolean;
}

export function MemberForm({ member, onSubmit, isLoading }: MemberFormProps) {
  const { data: companies = [] } = useCompanies();
  const [photoUrl, setPhotoUrl] = useState<string | null>(member?.profile_photo_url || null);

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
    },
  });

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
      });
      setPhotoUrl(member.profile_photo_url);
    }
  }, [member, form]);

  const handlePhotoChange = (url: string | null) => {
    setPhotoUrl(url);
    form.setValue("profile_photo_url", url || "");
  };

  const handleSubmit = (data: MemberFormData) => {
    onSubmit({
      ...data,
      profile_photo_url: photoUrl || undefined,
    });
  };

  const firstName = form.watch("first_name");
  const lastName = form.watch("last_name");

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
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
                      />
                    </FormControl>
                    <FormMessage />
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

          {/* Company & Status */}
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
                    <FormLabel className="cursor-pointer">Actief lid</FormLabel>
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
