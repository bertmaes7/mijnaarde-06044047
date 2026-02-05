 import { useState, useMemo } from "react";
 import { MainLayout } from "@/components/layout/MainLayout";
 import { Button } from "@/components/ui/button";
 import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
 import { Link } from "react-router-dom";
 import { ArrowLeft, Plus, FileText, Euro, Clock, CheckCircle, AlertTriangle } from "lucide-react";
 import { useInvoices, Invoice } from "@/hooks/useInvoices";
 import { InvoicesTable } from "@/components/invoices/InvoicesTable";
 import { InvoiceFormDialog } from "@/components/invoices/InvoiceFormDialog";
 import { VATOverviewDialog } from "@/components/invoices/VATOverviewDialog";
 import {
   Select,
   SelectContent,
   SelectItem,
   SelectTrigger,
   SelectValue,
 } from "@/components/ui/select";
 import { Input } from "@/components/ui/input";
 
 type StatusFilter = 'all' | 'draft' | 'sent' | 'paid' | 'overdue';
 
 export default function Invoices() {
   const { data: invoices = [], isLoading } = useInvoices();
   const [isFormOpen, setIsFormOpen] = useState(false);
   const [isVatOpen, setIsVatOpen] = useState(false);
   const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
   const [searchQuery, setSearchQuery] = useState("");
 
   // Filter invoices
   const filteredInvoices = useMemo(() => {
     return invoices.filter(inv => {
       // Status filter
       if (statusFilter !== 'all' && inv.status !== statusFilter) {
         return false;
       }
       
       // Search filter
       if (searchQuery) {
         const query = searchQuery.toLowerCase();
         const customerName = inv.member 
           ? `${inv.member.first_name} ${inv.member.last_name}`.toLowerCase()
           : inv.company?.name.toLowerCase() || '';
         
         return (
           inv.invoice_number.toLowerCase().includes(query) ||
           inv.description.toLowerCase().includes(query) ||
           customerName.includes(query)
         );
       }
       
       return true;
     });
   }, [invoices, statusFilter, searchQuery]);
 
   // Calculate stats
   const stats = useMemo(() => {
     const draft = invoices.filter(i => i.status === 'draft').length;
     const sent = invoices.filter(i => i.status === 'sent').length;
     const overdue = invoices.filter(i => i.status === 'overdue').length;
     const totalOpen = invoices
       .filter(i => i.status === 'sent' || i.status === 'overdue')
       .reduce((sum, i) => sum + (i.total - i.paid_amount), 0);
     const totalPaid = invoices
       .filter(i => i.status === 'paid')
       .reduce((sum, i) => sum + i.total, 0);
     
     return { draft, sent, overdue, totalOpen, totalPaid };
   }, [invoices]);
 
   return (
     <MainLayout>
       <div className="space-y-6">
         {/* Header */}
         <div className="flex items-center justify-between">
           <div className="flex items-center gap-4">
             <Button asChild variant="ghost" size="icon">
               <Link to="/finance">
                 <ArrowLeft className="h-5 w-5" />
               </Link>
             </Button>
             <div>
               <h1 className="font-display text-3xl font-bold text-foreground">
                 Uitgaande Facturen
               </h1>
               <p className="mt-1 text-muted-foreground">
                 Beheer facturen naar leden en bedrijven
               </p>
             </div>
           </div>
           <div className="flex gap-2">
             <Button variant="outline" onClick={() => setIsVatOpen(true)}>
               <FileText className="h-4 w-4 mr-2" />
               BTW-overzicht
             </Button>
             <Button onClick={() => setIsFormOpen(true)}>
               <Plus className="h-4 w-4 mr-2" />
               Nieuwe factuur
             </Button>
           </div>
         </div>
 
         {/* Stats */}
         <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
           <Card>
             <CardHeader className="pb-2">
               <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                 <Clock className="h-4 w-4" />
                 Concepten
               </CardTitle>
             </CardHeader>
             <CardContent>
               <p className="text-2xl font-bold">{stats.draft}</p>
             </CardContent>
           </Card>
           <Card>
             <CardHeader className="pb-2">
               <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                 <Euro className="h-4 w-4" />
                 Openstaand
               </CardTitle>
             </CardHeader>
             <CardContent>
               <p className="text-2xl font-bold">€ {stats.totalOpen.toFixed(2)}</p>
               <p className="text-xs text-muted-foreground">{stats.sent} verzonden</p>
             </CardContent>
           </Card>
           <Card>
             <CardHeader className="pb-2">
               <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                 <AlertTriangle className="h-4 w-4 text-destructive" />
                 Vervallen
               </CardTitle>
             </CardHeader>
             <CardContent>
               <p className="text-2xl font-bold text-destructive">{stats.overdue}</p>
             </CardContent>
           </Card>
           <Card>
             <CardHeader className="pb-2">
               <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                 <CheckCircle className="h-4 w-4 text-primary" />
                 Betaald
               </CardTitle>
             </CardHeader>
             <CardContent>
               <p className="text-2xl font-bold text-primary">€ {stats.totalPaid.toFixed(2)}</p>
             </CardContent>
           </Card>
         </div>
 
         {/* Filters */}
         <div className="flex gap-4">
           <Input
             placeholder="Zoeken op nummer, klant of omschrijving..."
             value={searchQuery}
             onChange={(e) => setSearchQuery(e.target.value)}
             className="max-w-sm"
           />
           <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
             <SelectTrigger className="w-40">
               <SelectValue />
             </SelectTrigger>
             <SelectContent>
               <SelectItem value="all">Alle statussen</SelectItem>
               <SelectItem value="draft">Concept</SelectItem>
               <SelectItem value="sent">Verzonden</SelectItem>
               <SelectItem value="paid">Betaald</SelectItem>
               <SelectItem value="overdue">Vervallen</SelectItem>
             </SelectContent>
           </Select>
         </div>
 
         {/* Table */}
         <Card>
           <CardContent className="p-0">
             <InvoicesTable invoices={filteredInvoices} isLoading={isLoading} />
           </CardContent>
         </Card>
       </div>
 
       {/* Dialogs */}
       <InvoiceFormDialog
         open={isFormOpen}
         onOpenChange={setIsFormOpen}
       />
       <VATOverviewDialog
         open={isVatOpen}
         onOpenChange={setIsVatOpen}
         invoices={invoices}
       />
     </MainLayout>
   );
 }
