import { useParams, useNavigate, Link } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useCompany, useUpdateCompany } from "@/hooks/useCompanies";
import { useMembers } from "@/hooks/useMembers";
import { MemberAvatar } from "@/components/members/MemberAvatar";
import { WebsitePreview } from "@/components/members/WebsitePreview";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useEffect, useMemo } from "react";
import {
  ArrowLeft,
  Save,
  Building2,
  MapPin,
  Globe,
  Mail,
  Phone,
  CreditCard,
  FileText,
  Hash,
  Users,
  Truck,
  Pencil,
} from "lucide-react";

const companySchema = z.object({
  name: z.string().min(1, "Bedrijfsnaam is verplicht"),
  address: z.string().optional(),
  postal_code: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  website: z.string().url("Ongeldige URL").optional().or(z.literal("")),
  email: z.string().email("Ongeldig e-mailadres").optional().or(z.literal("")),
  phone: z.string().optional(),
  bank_account: z.string().optional(),
  enterprise_number: z.string().optional(),
  vat_number: z.string().optional(),
  is_supplier: z.boolean(),
});

type CompanyFormData = z.infer<typeof companySchema>;

export default function CompanyDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: company, isLoading } = useCompany(id);
  const updateCompany = useUpdateCompany();
  const { data: allMembers = [] } = useMembers("");

  // Filter members belonging to this company
  const companyMembers = useMemo(() => {
    return allMembers.filter((member) => member.company_id === id);
  }, [allMembers, id]);

  const form = useForm<CompanyFormData>({
    resolver: zodResolver(companySchema),
    defaultValues: {
      name: "",
      address: "",
      postal_code: "",
      city: "",
      country: "België",
      website: "",
      email: "",
      phone: "",
      bank_account: "",
      enterprise_number: "",
      vat_number: "",
      is_supplier: false,
    },
  });

  useEffect(() => {
    if (company) {
      form.reset({
        name: company.name || "",
        address: company.address || "",
        postal_code: company.postal_code || "",
        city: company.city || "",
        country: company.country || "België",
        website: company.website || "",
        email: company.email || "",
        phone: company.phone || "",
        bank_account: company.bank_account || "",
        enterprise_number: company.enterprise_number || "",
        vat_number: company.vat_number || "",
        is_supplier: company.is_supplier ?? false,
      });
    }
  }, [company, form]);

  const handleSubmit = async (data: CompanyFormData) => {
    if (!id) return;
    
    await updateCompany.mutateAsync({
      id,
      data: {
        name: data.name,
        address: data.address || null,
        postal_code: data.postal_code || null,
        city: data.city || null,
        country: data.country || null,
        website: data.website || null,
        email: data.email || null,
        phone: data.phone || null,
        bank_account: data.bank_account || null,
        enterprise_number: data.enterprise_number || null,
        vat_number: data.vat_number || null,
        is_supplier: data.is_supplier,
      },
    });
  };

  const websiteUrl = form.watch("website");

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </MainLayout>
    );
  }

  if (!company) {
    return (
      <MainLayout>
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Building2 className="h-12 w-12 text-muted-foreground/50" />
          <p className="mt-4 text-muted-foreground">Bedrijf niet gevonden</p>
          <Button asChild className="mt-4">
            <Link to="/companies">Terug naar bedrijven</Link>
          </Button>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/companies")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="font-display text-3xl font-bold text-foreground">
                {company.name}
              </h1>
              {company.is_supplier && (
                <Badge variant="secondary" className="gap-1">
                  <Truck className="h-3 w-3" />
                  Leverancier
                </Badge>
              )}
            </div>
            <p className="mt-1 text-muted-foreground">Bedrijfsgegevens bewerken</p>
          </div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-3">
              {/* Basic Info */}
              <Card className="lg:col-span-2 card-elevated">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Building2 className="h-5 w-5 text-primary" />
                    Bedrijfsgegevens
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem className="sm:col-span-2">
                        <FormLabel>Bedrijfsnaam *</FormLabel>
                        <FormControl>
                          <Input placeholder="Acme BV" {...field} />
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
                          <Input type="email" placeholder="info@acme.be" {...field} />
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
                    name="website"
                    render={({ field }) => (
                      <FormItem className="sm:col-span-2">
                        <FormLabel>Website</FormLabel>
                        <FormControl>
                          <Input placeholder="https://www.acme.be" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="is_supplier"
                    render={({ field }) => (
                      <FormItem className="sm:col-span-2 flex items-center justify-between rounded-lg border p-3">
                        <FormLabel className="cursor-pointer flex items-center gap-2">
                          <Truck className="h-4 w-4" />
                          Leverancier
                        </FormLabel>
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

              {/* Website Preview */}
              <Card className="lg:col-span-1 card-elevated">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Globe className="h-5 w-5 text-primary" />
                    Website Preview
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <WebsitePreview url={websiteUrl} />
                </CardContent>
              </Card>

              {/* Financial Info */}
              <Card className="lg:col-span-2 card-elevated">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <CreditCard className="h-5 w-5 text-primary" />
                    Financiële gegevens
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 sm:grid-cols-3">
                  <FormField
                    control={form.control}
                    name="enterprise_number"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Ondernemingsnummer</FormLabel>
                        <FormControl>
                          <Input placeholder="0123.456.789" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="vat_number"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>BTW-nummer</FormLabel>
                        <FormControl>
                          <Input placeholder="BE0123456789" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="bank_account"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Bankrekeningnummer</FormLabel>
                        <FormControl>
                          <Input placeholder="BE12 3456 7890 1234" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              {/* Address */}
              <Card className="lg:col-span-1 card-elevated">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <MapPin className="h-5 w-5 text-primary" />
                    Adresgegevens
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Adres</FormLabel>
                        <FormControl>
                          <Input placeholder="Hoofdstraat 123" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-2 gap-4">
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
                  </div>
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

              {/* Company Members */}
              <Card className="lg:col-span-3 card-elevated">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Users className="h-5 w-5 text-primary" />
                    Gekoppelde leden ({companyMembers.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {companyMembers.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">
                      Geen leden gekoppeld aan dit bedrijf
                    </p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50">
                          <TableHead>Naam</TableHead>
                          <TableHead>E-mail</TableHead>
                          <TableHead>Telefoon</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="w-[80px]">Acties</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {companyMembers.map((member) => (
                          <TableRow key={member.id} className="hover:bg-muted/30">
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <MemberAvatar
                                  firstName={member.first_name}
                                  lastName={member.last_name}
                                  photoUrl={member.profile_photo_url}
                                  size="sm"
                                />
                                <span className="font-medium">
                                  {member.first_name} {member.last_name}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              {member.email ? (
                                <a
                                  href={`mailto:${member.email}`}
                                  className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary"
                                >
                                  <Mail className="h-3.5 w-3.5" />
                                  {member.email}
                                </a>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {member.phone ? (
                                <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                                  <Phone className="h-3.5 w-3.5" />
                                  {member.phone}
                                </span>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge variant={member.is_active ? "default" : "secondary"}>
                                {member.is_active ? "Actief" : "Inactief"}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Button asChild variant="ghost" size="sm">
                                <Link to={`/members/${member.id}`}>
                                  <Pencil className="h-4 w-4" />
                                </Link>
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={updateCompany.isPending} className="gap-2">
                <Save className="h-4 w-4" />
                {updateCompany.isPending ? "Opslaan..." : "Opslaan"}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </MainLayout>
  );
}
