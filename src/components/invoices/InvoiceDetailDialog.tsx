 import { format } from "date-fns";
 import { nl } from "date-fns/locale";
 import {
   Dialog,
   DialogContent,
   DialogHeader,
   DialogTitle,
 } from "@/components/ui/dialog";
 import {
   Table,
   TableBody,
   TableCell,
   TableHead,
   TableHeader,
   TableRow,
 } from "@/components/ui/table";
 import { useInvoice } from "@/hooks/useInvoices";
 import { InvoiceStatusBadge } from "./InvoiceStatusBadge";
 import { Skeleton } from "@/components/ui/skeleton";
 
 interface InvoiceDetailDialogProps {
   open: boolean;
   onOpenChange: (open: boolean) => void;
   invoiceId: string | undefined;
 }
 
 export function InvoiceDetailDialog({ open, onOpenChange, invoiceId }: InvoiceDetailDialogProps) {
   const { data: invoice, isLoading } = useInvoice(invoiceId);
 
   const getCustomerName = () => {
     if (invoice?.member) {
       return `${invoice.member.first_name} ${invoice.member.last_name}`;
     }
     if (invoice?.company) {
       return invoice.company.name;
     }
     return "-";
   };
 
   const getCustomerEmail = () => {
     if (invoice?.member?.email) {
       return invoice.member.email;
     }
     if (invoice?.company?.email) {
       return invoice.company.email;
     }
     return null;
   };
 
   return (
     <Dialog open={open} onOpenChange={onOpenChange}>
       <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
         <DialogHeader>
           <DialogTitle className="flex items-center gap-3">
             {isLoading ? (
               <Skeleton className="h-6 w-32" />
             ) : (
               <>
                 Factuur {invoice?.invoice_number}
                 {invoice && <InvoiceStatusBadge status={invoice.status as any} />}
               </>
             )}
           </DialogTitle>
         </DialogHeader>
 
         {isLoading ? (
           <div className="space-y-4">
             <Skeleton className="h-20 w-full" />
             <Skeleton className="h-40 w-full" />
           </div>
         ) : invoice ? (
           <div className="space-y-6">
             {/* Customer & Dates */}
             <div className="grid grid-cols-2 gap-6">
               <div>
                 <h4 className="text-sm font-medium text-muted-foreground mb-1">Klant</h4>
                 <p className="font-medium">{getCustomerName()}</p>
                 {getCustomerEmail() && (
                   <p className="text-sm text-muted-foreground">{getCustomerEmail()}</p>
                 )}
               </div>
               <div className="space-y-2">
                 <div>
                   <h4 className="text-sm font-medium text-muted-foreground mb-1">Factuurdatum</h4>
                   <p>{format(new Date(invoice.invoice_date), "d MMMM yyyy", { locale: nl })}</p>
                 </div>
                 <div>
                   <h4 className="text-sm font-medium text-muted-foreground mb-1">Vervaldatum</h4>
                   <p>{format(new Date(invoice.due_date), "d MMMM yyyy", { locale: nl })}</p>
                 </div>
               </div>
             </div>
 
             {/* Description */}
             <div>
               <h4 className="text-sm font-medium text-muted-foreground mb-1">Omschrijving</h4>
               <p>{invoice.description}</p>
             </div>
 
             {/* Items */}
             {invoice.items && invoice.items.length > 0 && (
               <div>
                 <h4 className="text-sm font-medium text-muted-foreground mb-2">Factuurregels</h4>
                 <Table>
                   <TableHeader>
                     <TableRow>
                       <TableHead>Omschrijving</TableHead>
                       <TableHead className="text-right">Aantal</TableHead>
                       <TableHead className="text-right">Prijs</TableHead>
                       <TableHead className="text-right">BTW</TableHead>
                       <TableHead className="text-right">Totaal</TableHead>
                     </TableRow>
                   </TableHeader>
                   <TableBody>
                     {invoice.items.map((item) => (
                       <TableRow key={item.id}>
                         <TableCell>{item.description}</TableCell>
                         <TableCell className="text-right">{item.quantity}</TableCell>
                         <TableCell className="text-right">€ {item.unit_price.toFixed(2)}</TableCell>
                         <TableCell className="text-right">{item.vat_rate}%</TableCell>
                         <TableCell className="text-right">€ {item.total.toFixed(2)}</TableCell>
                       </TableRow>
                     ))}
                   </TableBody>
                 </Table>
               </div>
             )}
 
             {/* Totals */}
             <div className="border-t pt-4 space-y-2">
               <div className="flex justify-between">
                 <span className="text-muted-foreground">Subtotaal</span>
                 <span>€ {invoice.subtotal.toFixed(2)}</span>
               </div>
               <div className="flex justify-between">
                 <span className="text-muted-foreground">BTW ({invoice.vat_rate}%)</span>
                 <span>€ {invoice.vat_amount.toFixed(2)}</span>
               </div>
               <div className="flex justify-between font-semibold text-lg border-t pt-2">
                 <span>Totaal</span>
                 <span>€ {invoice.total.toFixed(2)}</span>
               </div>
               {invoice.paid_amount > 0 && (
                 <div className="flex justify-between text-sm text-muted-foreground">
                   <span>Betaald</span>
                   <span>€ {invoice.paid_amount.toFixed(2)}</span>
                 </div>
               )}
             </div>
 
             {/* Additional Info */}
             <div className="border-t pt-4 grid grid-cols-2 gap-4 text-sm">
               {invoice.sent_at && (
                 <div>
                   <span className="text-muted-foreground">Verzonden op: </span>
                   <span>{format(new Date(invoice.sent_at), "d MMM yyyy HH:mm", { locale: nl })}</span>
                 </div>
               )}
               {invoice.paid_at && (
                 <div>
                   <span className="text-muted-foreground">Betaald op: </span>
                   <span>{format(new Date(invoice.paid_at), "d MMM yyyy", { locale: nl })}</span>
                 </div>
               )}
               {invoice.reminder_count > 0 && (
                 <div>
                   <span className="text-muted-foreground">Herinneringen: </span>
                   <span>{invoice.reminder_count}</span>
                 </div>
               )}
             </div>
 
             {/* Notes */}
             {invoice.notes && (
               <div className="border-t pt-4">
                 <h4 className="text-sm font-medium text-muted-foreground mb-1">Notities</h4>
                 <p className="text-sm">{invoice.notes}</p>
               </div>
             )}
           </div>
         ) : (
           <p className="text-muted-foreground">Factuur niet gevonden.</p>
         )}
       </DialogContent>
     </Dialog>
   );
 }