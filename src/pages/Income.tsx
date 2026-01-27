import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useIncome, useCreateIncome, useDeleteIncome } from "@/hooks/useFinance";
import { useMembers } from "@/hooks/useMembers";
import { useCompanies } from "@/hooks/useCompanies";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  Plus,
  TrendingUp,
  Trash2,
  User,
  Building2,
} from "lucide-react";

const incomeSchema = z.object({
  description: z.string().min(1, "Omschrijving is verplicht"),
  amount: z.string().min(1, "Bedrag is verplicht"),
  date: z.string().min(1, "Datum is verplicht"),
  type: z.enum(["membership", "donation", "other"]),
  member_id: z.string().optional(),
  company_id: z.string().optional(),
  notes: z.string().optional(),
});

type IncomeFormData = z.infer<typeof incomeSchema>;

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("nl-BE", {
    style: "currency",
    currency: "EUR",
  }).format(amount);
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString("nl-BE");
};

export default function Income() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { data: income = [], isLoading } = useIncome();
  const { data: members = [] } = useMembers("");
  const { data: companies = [] } = useCompanies();
  const createIncome = useCreateIncome();
  const deleteIncome = useDeleteIncome();

  const form = useForm<IncomeFormData>({
    resolver: zodResolver(incomeSchema),
    defaultValues: {
      description: "",
      amount: "",
      date: new Date().toISOString().split("T")[0],
      type: "membership",
      member_id: "",
      company_id: "",
      notes: "",
    },
  });

  const handleSubmit = async (data: IncomeFormData) => {
    await createIncome.mutateAsync({
      description: data.description,
      amount: parseFloat(data.amount),
      date: data.date,
      type: data.type,
      member_id: data.member_id && data.member_id !== "none" ? data.member_id : null,
      company_id: data.company_id && data.company_id !== "none" ? data.company_id : null,
      notes: data.notes || null,
    });
    form.reset();
    setIsDialogOpen(false);
  };

  const totalIncome = income.reduce((sum, i) => sum + Number(i.amount), 0);

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <Button asChild variant="ghost" size="icon">
              <Link to="/finance">
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </Button>
            <div>
              <h1 className="font-display text-3xl font-bold text-foreground">
                Inkomsten
              </h1>
              <p className="mt-1 text-muted-foreground">
                Totaal: {formatCurrency(totalIncome)}
              </p>
            </div>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Nieuwe inkomst
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle className="font-display flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  Nieuwe inkomst toevoegen
                </DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Omschrijving *</FormLabel>
                        <FormControl>
                          <Input placeholder="Lidgeld 2024" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="amount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Bedrag (€) *</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.01" placeholder="100.00" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="date"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Datum *</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Type</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="membership">Lidmaatschapsgeld</SelectItem>
                            <SelectItem value="donation">Donatie</SelectItem>
                            <SelectItem value="other">Overig</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="member_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Gekoppeld lid</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value || "none"}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecteer lid" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="none">Geen lid</SelectItem>
                              {members.map((member) => (
                                <SelectItem key={member.id} value={member.id}>
                                  {member.first_name} {member.last_name}
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
                      name="company_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Gekoppeld bedrijf</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value || "none"}>
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
                  </div>
                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notities</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Optionele notities..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="flex justify-end gap-2 pt-4">
                    <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                      Annuleren
                    </Button>
                    <Button type="submit" disabled={createIncome.isPending}>
                      {createIncome.isPending ? "Opslaan..." : "Opslaan"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Income Table */}
        <Card className="card-elevated">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <TrendingUp className="h-5 w-5 text-primary" />
              Alle inkomsten
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              </div>
            ) : income.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                Nog geen inkomsten geregistreerd
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Datum</TableHead>
                    <TableHead>Omschrijving</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Gekoppeld aan</TableHead>
                    <TableHead className="text-right">Bedrag</TableHead>
                    <TableHead className="w-[80px]">Acties</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {income.map((item) => (
                    <TableRow key={item.id} className="hover:bg-muted/30">
                      <TableCell>{formatDate(item.date)}</TableCell>
                      <TableCell className="font-medium">{item.description}</TableCell>
                      <TableCell>
                        <Badge variant="default">
                          {item.type === "membership"
                            ? "Lidgeld"
                            : item.type === "donation"
                            ? "Donatie"
                            : "Overig"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {item.member ? (
                          <span className="flex items-center gap-1.5">
                            <User className="h-3.5 w-3.5" />
                            {item.member.first_name} {item.member.last_name}
                          </span>
                        ) : item.company ? (
                          <span className="flex items-center gap-1.5">
                            <Building2 className="h-3.5 w-3.5" />
                            {item.company.name}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-medium text-green-600">
                        {formatCurrency(Number(item.amount))}
                      </TableCell>
                      <TableCell>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Inkomst verwijderen?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Weet je zeker dat je deze inkomst wilt verwijderen? Dit kan niet
                                ongedaan worden gemaakt.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Annuleren</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteIncome.mutate(item.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Verwijderen
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
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
