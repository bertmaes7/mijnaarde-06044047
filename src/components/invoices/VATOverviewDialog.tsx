 import { useState, useMemo } from "react";
 import { format } from "date-fns";
 import { nl } from "date-fns/locale";
 import { FileText, Download } from "lucide-react";
 import {
   Dialog,
   DialogContent,
   DialogHeader,
   DialogTitle,
 } from "@/components/ui/dialog";
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
 import { Button } from "@/components/ui/button";
 import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
 import { Invoice } from "@/hooks/useInvoices";
 
 interface VATOverviewDialogProps {
   open: boolean;
   onOpenChange: (open: boolean) => void;
   invoices: Invoice[];
 }
 
 type Period = 'Q1' | 'Q2' | 'Q3' | 'Q4' | 'year';
 
 export function VATOverviewDialog({ open, onOpenChange, invoices }: VATOverviewDialogProps) {
   const currentYear = new Date().getFullYear();
   const [selectedYear, setSelectedYear] = useState(currentYear.toString());
   const [selectedPeriod, setSelectedPeriod] = useState<Period>('year');
 
   const years = useMemo(() => {
     const uniqueYears = new Set(invoices.map(inv => new Date(inv.invoice_date).getFullYear()));
     uniqueYears.add(currentYear);
     return Array.from(uniqueYears).sort((a, b) => b - a);
   }, [invoices, currentYear]);
 
   const filteredInvoices = useMemo(() => {
     const year = parseInt(selectedYear);
     
     return invoices.filter(inv => {
       if (inv.status === 'draft') return false;
       
       const date = new Date(inv.invoice_date);
       const invYear = date.getFullYear();
       const month = date.getMonth();
       
       if (invYear !== year) return false;
       
       switch (selectedPeriod) {
         case 'Q1': return month >= 0 && month <= 2;
         case 'Q2': return month >= 3 && month <= 5;
         case 'Q3': return month >= 6 && month <= 8;
         case 'Q4': return month >= 9 && month <= 11;
         case 'year': return true;
         default: return true;
       }
     });
   }, [invoices, selectedYear, selectedPeriod]);
 
   const vatSummary = useMemo(() => {
     const summary: Record<number, { subtotal: number; vat: number; total: number }> = {};
     
     filteredInvoices.forEach(inv => {
       const rate = Math.round(inv.vat_rate);
       if (!summary[rate]) {
         summary[rate] = { subtotal: 0, vat: 0, total: 0 };
       }
       summary[rate].subtotal += inv.subtotal;
       summary[rate].vat += inv.vat_amount;
       summary[rate].total += inv.total;
     });
     
     return summary;
   }, [filteredInvoices]);
 
   const totals = useMemo(() => {
     return filteredInvoices.reduce(
       (acc, inv) => ({
         subtotal: acc.subtotal + inv.subtotal,
         vat: acc.vat + inv.vat_amount,
         total: acc.total + inv.total,
       }),
       { subtotal: 0, vat: 0, total: 0 }
     );
   }, [filteredInvoices]);
 
   const getPeriodLabel = (period: Period) => {
     switch (period) {
       case 'Q1': return '1e kwartaal (jan-mrt)';
       case 'Q2': return '2e kwartaal (apr-jun)';
       case 'Q3': return '3e kwartaal (jul-sep)';
       case 'Q4': return '4e kwartaal (okt-dec)';
       case 'year': return 'Volledig jaar';
     }
   };
 
   const exportToCSV = () => {
     const headers = ['Factuurnummer', 'Datum', 'Klant', 'Subtotaal', 'BTW %', 'BTW bedrag', 'Totaal'];
     const rows = filteredInvoices.map(inv => [
       inv.invoice_number,
       format(new Date(inv.invoice_date), 'yyyy-MM-dd'),
       inv.member ? `${inv.member.first_name} ${inv.member.last_name}` : inv.company?.name || '',
       inv.subtotal.toFixed(2),
       inv.vat_rate.toFixed(0),
       inv.vat_amount.toFixed(2),
       inv.total.toFixed(2),
     ]);
 
     const csv = [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
     const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
     const url = URL.createObjectURL(blob);
     const link = document.createElement('a');
     link.href = url;
     link.download = `btw-overzicht-${selectedYear}-${selectedPeriod}.csv`;
     link.click();
     URL.revokeObjectURL(url);
   };
 
   return (
     <Dialog open={open} onOpenChange={onOpenChange}>
       <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
         <DialogHeader>
           <DialogTitle className="flex items-center gap-2">
             <FileText className="h-5 w-5" />
             BTW-overzicht
           </DialogTitle>
         </DialogHeader>
 
         <div className="space-y-6">
           {/* Filters */}
           <div className="flex gap-4">
             <div className="w-32">
               <Select value={selectedYear} onValueChange={setSelectedYear}>
                 <SelectTrigger>
                   <SelectValue />
                 </SelectTrigger>
                 <SelectContent>
                   {years.map(year => (
                     <SelectItem key={year} value={year.toString()}>
                       {year}
                     </SelectItem>
                   ))}
                 </SelectContent>
               </Select>
             </div>
             <div className="w-56">
               <Select value={selectedPeriod} onValueChange={(v) => setSelectedPeriod(v as Period)}>
                 <SelectTrigger>
                   <SelectValue />
                 </SelectTrigger>
                 <SelectContent>
                   <SelectItem value="year">Volledig jaar</SelectItem>
                   <SelectItem value="Q1">1e kwartaal</SelectItem>
                   <SelectItem value="Q2">2e kwartaal</SelectItem>
                   <SelectItem value="Q3">3e kwartaal</SelectItem>
                   <SelectItem value="Q4">4e kwartaal</SelectItem>
                 </SelectContent>
               </Select>
             </div>
             <Button variant="outline" onClick={exportToCSV} className="ml-auto">
               <Download className="h-4 w-4 mr-2" />
               Exporteren
             </Button>
           </div>
 
           {/* Summary Cards */}
           <div className="grid grid-cols-3 gap-4">
             <Card>
               <CardHeader className="pb-2">
                 <CardTitle className="text-sm font-medium text-muted-foreground">Omzet (excl. BTW)</CardTitle>
               </CardHeader>
               <CardContent>
                 <p className="text-2xl font-bold">€ {totals.subtotal.toFixed(2)}</p>
               </CardContent>
             </Card>
             <Card>
               <CardHeader className="pb-2">
                 <CardTitle className="text-sm font-medium text-muted-foreground">Verschuldigde BTW</CardTitle>
               </CardHeader>
               <CardContent>
                 <p className="text-2xl font-bold">€ {totals.vat.toFixed(2)}</p>
               </CardContent>
             </Card>
             <Card>
               <CardHeader className="pb-2">
                 <CardTitle className="text-sm font-medium text-muted-foreground">Totaal (incl. BTW)</CardTitle>
               </CardHeader>
               <CardContent>
                 <p className="text-2xl font-bold">€ {totals.total.toFixed(2)}</p>
               </CardContent>
             </Card>
           </div>
 
           {/* VAT by Rate */}
           {Object.keys(vatSummary).length > 0 && (
             <div>
               <h4 className="font-medium mb-2">BTW per tarief</h4>
               <Table>
                 <TableHeader>
                   <TableRow>
                     <TableHead>BTW-tarief</TableHead>
                     <TableHead className="text-right">Omzet</TableHead>
                     <TableHead className="text-right">BTW bedrag</TableHead>
                   </TableRow>
                 </TableHeader>
                 <TableBody>
                   {Object.entries(vatSummary)
                     .sort(([a], [b]) => parseInt(b) - parseInt(a))
                     .map(([rate, data]) => (
                       <TableRow key={rate}>
                         <TableCell>{rate}%</TableCell>
                         <TableCell className="text-right">€ {data.subtotal.toFixed(2)}</TableCell>
                         <TableCell className="text-right">€ {data.vat.toFixed(2)}</TableCell>
                       </TableRow>
                     ))}
                 </TableBody>
               </Table>
             </div>
           )}
 
           {/* Invoice List */}
           <div>
             <h4 className="font-medium mb-2">Facturen ({filteredInvoices.length})</h4>
             {filteredInvoices.length === 0 ? (
               <p className="text-muted-foreground text-center py-8">
                 Geen facturen gevonden voor {getPeriodLabel(selectedPeriod)} {selectedYear}
               </p>
             ) : (
               <Table>
                 <TableHeader>
                   <TableRow>
                     <TableHead>Nummer</TableHead>
                     <TableHead>Datum</TableHead>
                     <TableHead>Klant</TableHead>
                     <TableHead className="text-right">Subtotaal</TableHead>
                     <TableHead className="text-right">BTW</TableHead>
                     <TableHead className="text-right">Totaal</TableHead>
                   </TableRow>
                 </TableHeader>
                 <TableBody>
                   {filteredInvoices.map(inv => (
                     <TableRow key={inv.id}>
                       <TableCell className="font-medium">{inv.invoice_number}</TableCell>
                       <TableCell>{format(new Date(inv.invoice_date), "d MMM yyyy", { locale: nl })}</TableCell>
                       <TableCell>
                         {inv.member
                           ? `${inv.member.first_name} ${inv.member.last_name}`
                           : inv.company?.name}
                       </TableCell>
                       <TableCell className="text-right">€ {inv.subtotal.toFixed(2)}</TableCell>
                       <TableCell className="text-right">€ {inv.vat_amount.toFixed(2)}</TableCell>
                       <TableCell className="text-right">€ {inv.total.toFixed(2)}</TableCell>
                     </TableRow>
                   ))}
                 </TableBody>
               </Table>
             )}
           </div>
         </div>
       </DialogContent>
     </Dialog>
   );
 }