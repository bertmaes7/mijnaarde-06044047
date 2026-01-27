import { useState } from "react";
import { Link } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import { useCompanies, useCreateCompany } from "@/hooks/useCompanies";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Search,
  Plus,
  Building2,
  Globe,
  Mail,
  Phone,
  MapPin,
  CreditCard,
  FileText,
  Hash,
  Truck,
  Pencil,
} from "lucide-react";
import { WebsitePreview } from "@/components/members/WebsitePreview";

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

export default function Companies() {
  const [search, setSearch] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { data: companies = [], isLoading } = useCompanies();
  const createCompany = useCreateCompany();

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

  const filteredCompanies = companies.filter((company) =>
    company.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleSubmit = async (data: CompanyFormData) => {
    await createCompany.mutateAsync({
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
    });
    form.reset();
    setIsDialogOpen(false);
  };

  const websiteUrl = form.watch("website");

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold text-foreground">
              Bedrijven
            </h1>
            <p className="mt-1 text-muted-foreground">
              Beheer gekoppelde organisaties
            </p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Nieuw bedrijf
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="font-display">
                  Nieuw bedrijf toevoegen
                </DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(handleSubmit)}
                  className="space-y-4"
                >
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Bedrijfsnaam *</FormLabel>
                        <FormControl>
                          <Input placeholder="Acme BV" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>E-mail</FormLabel>
                          <FormControl>
                            <Input
                              type="email"
                              placeholder="info@acme.be"
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
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <FormField
                        control={form.control}
                        name="website"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Website</FormLabel>
                            <FormControl>
                              <Input placeholder="https://www.acme.be" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <div>
                      <WebsitePreview url={websiteUrl} />
                    </div>
                  </div>
                  <FormField
                    control={form.control}
                    name="is_supplier"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between rounded-lg border p-3">
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
                  <div className="grid gap-4 sm:grid-cols-3">
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
                  </div>
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
                  <div className="grid gap-4 sm:grid-cols-3">
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
                  </div>
                  <div className="flex justify-end gap-2 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsDialogOpen(false)}
                    >
                      Annuleren
                    </Button>
                    <Button type="submit" disabled={createCompany.isPending}>
                      {createCompany.isPending ? "Opslaan..." : "Opslaan"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Zoek op bedrijfsnaam..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Companies Grid */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : filteredCompanies.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Building2 className="h-12 w-12 text-muted-foreground/50" />
            <p className="mt-4 text-muted-foreground">Geen bedrijven gevonden</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredCompanies.map((company) => (
              <Card key={company.id} className="card-elevated group relative">
                <Link to={`/companies/${company.id}`} className="absolute inset-0 z-10" />
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Building2 className="h-5 w-5 text-primary" />
                    <span className="group-hover:text-primary transition-colors">
                      {company.name}
                    </span>
                    {company.is_supplier && (
                      <Badge variant="secondary" className="ml-auto gap-1">
                        <Truck className="h-3 w-3" />
                        Leverancier
                      </Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  {company.email && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Mail className="h-4 w-4" />
                      {company.email}
                    </div>
                  )}
                  {company.phone && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Phone className="h-4 w-4" />
                      {company.phone}
                    </div>
                  )}
                  {company.website && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Globe className="h-4 w-4" />
                      {company.website.replace(/^https?:\/\//, "")}
                    </div>
                  )}
                  {(company.address || company.city) && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      <span>
                        {[company.address, company.postal_code, company.city]
                          .filter(Boolean)
                          .join(", ")}
                      </span>
                    </div>
                  )}
                  {company.enterprise_number && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <FileText className="h-4 w-4" />
                      <span>KBO: {company.enterprise_number}</span>
                    </div>
                  )}
                  {company.vat_number && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Hash className="h-4 w-4" />
                      <span>BTW: {company.vat_number}</span>
                    </div>
                  )}
                  {company.bank_account && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <CreditCard className="h-4 w-4" />
                      <span>{company.bank_account}</span>
                    </div>
                  )}
                  <div className="pt-2 flex justify-end relative z-20">
                    <Button asChild variant="ghost" size="sm" className="gap-1">
                      <Link to={`/companies/${company.id}`}>
                        <Pencil className="h-4 w-4" />
                        Bewerken
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
